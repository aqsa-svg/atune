import { sql, sqlBatch, parsePgArray } from "./db";
import { storeInsight } from "./data";
import { chat, extractJson, type ChatMessage } from "./ai";
import { labelForGoal, labelForLow } from "./options";

type DayLog = {
  day: string;
  dow: string;
  mood: number | null;
  energy: number | null;
  sleep: number | null;
  habitsDone: number;
};

type CoachData = {
  goals: string[];
  lowPeriods: string[];
  wake: string | null;
  sleep: string | null;
  habitNames: string[];
  habitTotal: number;
  logs: DayLog[];
  checkinCount: number;
};

async function getCoachData(userId: number): Promise<CoachData> {
  const [p, l, h] = await sqlBatch([
    { query: `SELECT wake_time, sleep_time, goals, low_periods FROM profile WHERE user_id = $1`, params: [userId] },
    {
      query: `SELECT to_char(dl.log_date, 'YYYY-MM-DD') AS day, to_char(dl.log_date, 'Dy') AS dow,
                     dl.mood, dl.energy, dl.sleep_hours,
                     (SELECT count(*) FROM habit_log hl
                        WHERE hl.user_id = dl.user_id AND hl.log_date = dl.log_date AND hl.done) AS habits_done
              FROM daily_log dl
              WHERE dl.user_id = $1 AND dl.log_date >= CURRENT_DATE - 13
              ORDER BY dl.log_date`,
      params: [userId],
    },
    { query: `SELECT name FROM habit WHERE user_id = $1 AND archived = FALSE ORDER BY sort, id`, params: [userId] },
  ]);

  const prof = p?.rows[0] as
    | { wake_time: string | null; sleep_time: string | null; goals: unknown; low_periods: unknown }
    | undefined;

  const logs: DayLog[] = ((l?.rows ?? []) as Record<string, unknown>[]).map((r) => ({
    day: String(r.day),
    dow: String(r.dow),
    mood: r.mood != null ? Number(r.mood) : null,
    energy: r.energy != null ? Number(r.energy) : null,
    sleep: r.sleep_hours != null ? Number(r.sleep_hours) : null,
    habitsDone: Number(r.habits_done ?? 0),
  }));

  const habitNames = ((h?.rows ?? []) as { name: string }[]).map((r) => String(r.name));

  return {
    goals: prof ? parsePgArray(prof.goals) : [],
    lowPeriods: prof ? parsePgArray(prof.low_periods) : [],
    wake: prof?.wake_time ?? null,
    sleep: prof?.sleep_time ?? null,
    habitNames,
    habitTotal: habitNames.length,
    logs,
    checkinCount: logs.length,
  };
}

type CoachReply = {
  enough_data?: boolean;
  insight?: string;
  evidence?: string[];
  references_habits?: string[];
};

const SYSTEM = `You are Attune, a calm, precise wellness companion.
You produce exactly ONE short insight (1–2 sentences, warm, specific, second person).
Hard rules — this is the whole point of the product:
- Reference ONLY facts present in DATA. Never invent numbers, studies, averages, or patterns.
- If there are fewer than 4 days of check-ins, you MUST NOT claim any multi-day pattern. Instead give a grounded nudge about what little is logged and that you're still learning.
- Any habit you name must appear in DATA.habitNames verbatim.
Return ONLY a JSON object, no prose.`;

function buildUser(data: CoachData): string {
  const readable = {
    goals: data.goals.map(labelForGoal),
    lowPeriods: data.lowPeriods.map(labelForLow),
    usualWake: data.wake,
    usualSleep: data.sleep,
    habitNames: data.habitNames,
    habitTotal: data.habitTotal,
    checkinDays: data.checkinCount,
    logs: data.logs,
  };
  return `DATA:
${JSON.stringify(readable, null, 2)}

Return JSON with this exact shape:
{
  "enough_data": boolean,      // true ONLY if >=4 check-in days AND a real pattern is visible
  "insight": string,           // <=240 chars, grounded ONLY in DATA
  "evidence": string[],        // short factual bases drawn directly from DATA (e.g. "energy 2 on Mon")
  "references_habits": string[] // any habit names you mention; must be from DATA.habitNames
}`;
}

/** Deterministic faithfulness gate — the RAGAS instinct without a second model call. */
function isGrounded(reply: CoachReply | null, data: CoachData): boolean {
  if (!reply || typeof reply.insight !== "string" || !reply.insight.trim()) return false;
  const names = new Set(data.habitNames.map((n) => n.toLowerCase()));
  for (const h of reply.references_habits ?? []) {
    if (!names.has(String(h).toLowerCase())) return false; // named a habit that doesn't exist
  }
  if (reply.enough_data === true && data.checkinCount < 4) return false; // pattern claim on thin data
  if (!Array.isArray(reply.evidence) || reply.evidence.length === 0) return false;
  return true;
}

function groundingReceipt(data: CoachData): string {
  const n = data.checkinCount;
  return `Grounded in ${n} day${n === 1 ? "" : "s"} of your own check-ins`;
}

function honestFallback(data: CoachData): string {
  const n = data.checkinCount;
  if (n < 4) {
    return `You've checked in ${n} day${n === 1 ? "" : "s"} so far. A few more and I'll be able to tell you what actually moves your energy and mood — not before.`;
  }
  return `I'm still watching your check-ins for a pattern clear enough to stand behind. Keep going.`;
}

/**
 * Generate today's grounded insight from real logged data and store it.
 * Best-effort: callers wrap in try/catch so a coach hiccup never breaks a check-in.
 */
export async function generateDailyInsight(userId: number): Promise<void> {
  const data = await getCoachData(userId);
  if (data.checkinCount === 0) return; // nothing logged yet — keep the day-one suggestion

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: buildUser(data) },
  ];

  let body: string;
  try {
    const raw = await chat(messages, { maxTokens: 400, temperature: 0.4 });
    const reply = extractJson<CoachReply>(raw);
    body = reply && isGrounded(reply, data) ? reply.insight!.trim() : honestFallback(data);
  } catch {
    body = honestFallback(data);
  }

  await storeInsight(userId, "daily", body, groundingReceipt(data));
}
