import { sqlBatch, parsePgArray } from "./db";
import { storeInsight } from "./data";
import { chat, extractJson, type ChatMessage } from "./ai";
import { isGrounded, type CoachReply, type GroundingContext } from "./grounding";
import { labelForGoal, labelForLow } from "./options";

type LogEntry = {
  date: string;
  mood: number | null;
  energy: number | null;
  sleep: number | null;
  note: string | null;
};

type CoachData = {
  goals: string[];
  lowPeriods: string[];
  wake: string | null;
  sleep: string | null;
  habits: { id: string; name: string }[];
  habitCompletions: { habit_id: string; name: string; completed_days: number }[];
  logs: LogEntry[];
  dayCount: number;
};

async function getCoachData(userId: number): Promise<CoachData> {
  const [p, l, h, c] = await sqlBatch([
    { query: `SELECT wake_time, sleep_time, goals, low_periods FROM profile WHERE user_id = $1`, params: [userId] },
    {
      query: `SELECT to_char(log_date, 'YYYY-MM-DD') AS day, mood, energy, sleep_hours, note
              FROM daily_log WHERE user_id = $1 AND log_date >= CURRENT_DATE - 13 ORDER BY log_date`,
      params: [userId],
    },
    { query: `SELECT id, name FROM habit WHERE user_id = $1 AND archived = FALSE ORDER BY sort, id`, params: [userId] },
    {
      query: `SELECT habit_id, count(*) AS n FROM habit_log
              WHERE user_id = $1 AND done = TRUE AND log_date >= CURRENT_DATE - 13 GROUP BY habit_id`,
      params: [userId],
    },
  ]);

  const prof = p?.rows[0] as
    | { wake_time: string | null; sleep_time: string | null; goals: unknown; low_periods: unknown }
    | undefined;
  const habits = ((h?.rows ?? []) as { id: number | string; name: string }[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
  }));
  const countById = new Map<string, number>();
  for (const r of (c?.rows ?? []) as { habit_id: number | string; n: number | string }[]) {
    countById.set(String(r.habit_id), Number(r.n));
  }
  const logs: LogEntry[] = ((l?.rows ?? []) as Record<string, unknown>[]).map((r) => ({
    date: String(r.day),
    mood: r.mood != null ? Number(r.mood) : null,
    energy: r.energy != null ? Number(r.energy) : null,
    sleep: r.sleep_hours != null ? Number(r.sleep_hours) : null,
    note: (r.note as string | null) ?? null,
  }));

  return {
    goals: prof ? parsePgArray(prof.goals) : [],
    lowPeriods: prof ? parsePgArray(prof.low_periods) : [],
    wake: prof?.wake_time ?? null,
    sleep: prof?.sleep_time ?? null,
    habits,
    habitCompletions: habits.map((x) => ({
      habit_id: x.id,
      name: x.name,
      completed_days: countById.get(x.id) ?? 0,
    })),
    logs,
    dayCount: logs.length,
  };
}

const SYSTEM = `You are the coaching engine for Attune, a wellness app whose single rule is: never
fabricate. Every word you output must trace back to the data provided in this request.
If the data doesn't support a claim, you do not make it.

You will receive:
- profile: the user's stated rhythm, goals, low periods, and habits
- logs: the user's daily logs for up to the last 14 days (mood, energy, sleep, note), each 1-5 unless noted
- habits: the list of habits this user actually tracks (name + id)
- habit_completions: per-habit completion counts over the same window
- day_count: how many distinct days of logs exist

Return ONE of three things, chosen by how much data exists:

1. PATTERN (only if day_count >= 7 AND a real relationship is present in the numbers)
   A finding stated with the actual averages as evidence. Rank or contrast when you can
   ("walking moves your energy more than sleep does") rather than restating the obvious.
   Never claim a multi-day pattern on fewer than 7 days.

2. EXPERIMENT (the default when day_count < 7, or when data is too thin for a pattern)
   Do NOT apologize for lacking data. Propose one small, testable action for today drawn
   ONLY from a habit the user already tracks, and state what you'll compare tomorrow. Frame
   the user as a co-investigator, not a patient. The experiment must be something the provided
   data can actually measure later (a tracked habit vs. next-day energy/mood/sleep). One
   experiment, one variable.

3. HONEST_FALLBACK (only if there is genuinely nothing to work with - 0-1 logs and no completed
   habits) A brief, calm acknowledgement plus the single first action that starts signal.

Hard rules:
- Reference only habits that appear in habits. Never invent or rename one.
- Every claim in evidence must be a number or comparison computable from the data given.
- No medical, diagnostic, or clinical language. No guarantees. No streak pressure, guilt, or urgency.
- If choosing between EXPERIMENT and PATTERN and the pattern is weak, choose EXPERIMENT.
- One insight only. Do not stack multiple findings.

Return ONLY valid JSON, no prose, in this exact shape:
{
  "type": "pattern" | "experiment" | "honest_fallback",
  "enough_data": boolean,
  "insight": string,
  "evidence": string[],
  "references_habits": string[],
  "experiment": { "action": string, "habit_id": string, "compare": string } | null
}`;

function buildUser(data: CoachData): string {
  const payload = {
    profile: {
      wake: data.wake,
      sleep: data.sleep,
      goals: data.goals.map(labelForGoal),
      low_periods: data.lowPeriods.map(labelForLow),
      habits: data.habits.map((h) => h.name),
    },
    logs: data.logs,
    habits: data.habits,
    habit_completions: data.habitCompletions,
    day_count: data.dayCount,
  };
  return `DATA:\n${JSON.stringify(payload, null, 2)}`;
}

function groundingReceipt(data: CoachData): string {
  const n = data.dayCount;
  return `Grounded in ${n} day${n === 1 ? "" : "s"} of your own check-ins`;
}

function honestFallback(data: CoachData): string {
  const n = data.dayCount;
  if (n < 4) {
    return `You've checked in ${n} day${n === 1 ? "" : "s"} so far. A few more and I'll be able to tell you what actually moves your energy and mood — not before.`;
  }
  return `I'm still watching your check-ins for a pattern clear enough to stand behind. Keep going.`;
}

export type InsightMeta = { type: string; action?: string; compare?: string };

/**
 * Generate today's grounded insight (pattern | experiment | honest_fallback) from real
 * logged data and store it. The gate — not the model — decides what's trustworthy; on any
 * failure we fall back honestly. Best-effort: callers wrap in try/catch.
 */
export async function generateDailyInsight(userId: number): Promise<void> {
  const data = await getCoachData(userId);
  if (data.dayCount === 0) return; // nothing logged — keep the day-one suggestion

  const ctx: GroundingContext = {
    habitNames: data.habits.map((h) => h.name),
    habitIds: data.habits.map((h) => h.id),
    dayCount: data.dayCount,
  };

  let body = honestFallback(data);
  let meta: InsightMeta = { type: "honest_fallback" };

  try {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: buildUser(data) },
    ];
    const raw = await chat(messages, { maxTokens: 500, temperature: 0.4 });
    const reply = extractJson<CoachReply>(raw);
    if (reply && isGrounded(reply, ctx)) {
      body = reply.insight!.trim();
      // Normalize: only an experiment keeps its experiment object.
      meta =
        reply.type === "experiment" && reply.experiment
          ? { type: "experiment", action: reply.experiment.action, compare: reply.experiment.compare }
          : { type: reply.type ?? "honest_fallback" };
    }
  } catch {
    // keep the honest fallback
  }

  await storeInsight(userId, "daily", body, groundingReceipt(data), meta);
}
