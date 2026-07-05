// Test the new experiment-framing coach prompt against REAL demo data, both paths:
//   Run 1: full 14 days  -> should return a PATTERN
//   Run 2: first 3 days   -> should return an EXPERIMENT (day_count < 7)
// Then validate the experiment output (habit_id real, compare measurable).
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const KEY = env.COH_APP_KEY;
const BASE = env.COHESIVITY_BASE || "https://cohesivity.ai";
const DEMO = -1;

async function db(statements) {
  const r = await fetch(`${BASE}/edge/postgres?key=${encodeURIComponent(KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "attune/1" },
    body: JSON.stringify({ statements }),
  });
  const j = await r.json();
  if (!Array.isArray(j.results)) {
    console.error("DB error", r.status, JSON.stringify(j).slice(0, 400));
    process.exit(1);
  }
  return j.results;
}

const parseArr = (v) =>
  Array.isArray(v)
    ? v.map(String)
    : typeof v === "string"
      ? v.replace(/^\{/, "").replace(/\}$/, "").split(",").filter(Boolean).map((s) => s.replace(/^"|"$/g, ""))
      : [];

const [p, l, h, hl] = await db([
  { query: `SELECT wake_time, sleep_time, goals, low_periods FROM profile WHERE user_id=$1`, params: [DEMO] },
  { query: `SELECT to_char(log_date,'YYYY-MM-DD') AS day, mood, energy, sleep_hours, note FROM daily_log WHERE user_id=$1 ORDER BY log_date`, params: [DEMO] },
  { query: `SELECT id, name FROM habit WHERE user_id=$1 AND archived=FALSE ORDER BY sort, id`, params: [DEMO] },
  { query: `SELECT to_char(log_date,'YYYY-MM-DD') AS day, habit_id FROM habit_log WHERE user_id=$1 AND done=TRUE`, params: [DEMO] },
]);

const prof = p.rows[0];
const habits = h.rows.map((r) => ({ id: String(r.id), name: r.name }));
const allLogs = l.rows.map((r) => ({
  date: r.day,
  mood: Number(r.mood),
  energy: Number(r.energy),
  sleep: r.sleep_hours != null ? Number(r.sleep_hours) : null,
  note: r.note ?? null,
}));
const hlRows = hl.rows.map((r) => ({ day: r.day, habit_id: String(r.habit_id) }));

function completions(dates) {
  const set = new Set(dates);
  const counts = Object.fromEntries(habits.map((x) => [x.id, 0]));
  for (const r of hlRows) if (set.has(r.day) && counts[r.habit_id] !== undefined) counts[r.habit_id]++;
  return habits.map((x) => ({ habit_id: x.id, name: x.name, completed_days: counts[x.id] }));
}

function payload(logs) {
  return {
    profile: {
      wake: prof.wake_time,
      sleep: prof.sleep_time,
      goals: parseArr(prof.goals),
      low_periods: parseArr(prof.low_periods),
      habits: habits.map((x) => x.name),
    },
    logs,
    habits,
    habit_completions: completions(logs.map((x) => x.date)),
    day_count: logs.length,
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
   ONLY from a habit the user already tracks, and state what you'll compare tomorrow.
   Frame the user as a co-investigator, not a patient. The experiment must be something the
   provided data can actually measure later (a tracked habit vs. next-day energy/mood/sleep).
   One experiment, one variable.

3. HONEST_FALLBACK (only if there is genuinely nothing to work with - 0-1 logs and no
   completed habits) A brief, calm acknowledgement plus the single first action that starts signal.

Hard rules:
- Reference only habits that appear in habits. Never invent or rename one.
- Every claim in evidence must be a number or comparison computable from the data given.
- No medical/diagnostic/clinical language. No guarantees. No streak pressure, guilt, or urgency.
- If choosing between EXPERIMENT and PATTERN and the pattern is weak, choose EXPERIMENT.
- One insight only.

Return ONLY valid JSON, no prose, in this exact shape:
{
  "type": "pattern" | "experiment" | "honest_fallback",
  "enough_data": boolean,
  "insight": string,
  "evidence": string[],
  "references_habits": string[],
  "experiment": { "action": string, "habit_id": string, "compare": string } | null
}`;

async function coach(pl) {
  const r = await fetch(`${BASE}/edge/ai-gateway/v1/chat/completions?key=${encodeURIComponent(KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "attune/1" },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4.5",
      max_tokens: 500,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: "DATA:\n" + JSON.stringify(pl, null, 2) },
      ],
    }),
  });
  return (await r.json()).choices?.[0]?.message?.content ?? "(no content)";
}
const extract = (t) => {
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
};

console.log("habits:", habits.map((x) => `${x.id}:${x.name}`).join(", "));

const slice = payload(allLogs.slice(0, 3));
console.log(`\n=== RUN 2 — 3-day slice (day_count=${slice.day_count}) — expect EXPERIMENT ===`);
const out2 = await coach(slice);
console.log(out2);

const r2 = extract(out2);
const ids = new Set(habits.map((x) => x.id));
console.log("\n=== RUN 2 validation ===");
if (!r2) {
  console.log("Could not parse JSON.");
} else {
  console.log("type:", r2.type);
  console.log("references_habits all real:", (r2.references_habits || []).every((x) => ids.has(String(x))));
  const eid = r2.experiment?.habit_id;
  console.log("experiment.habit_id:", eid, "-> real habit:", eid ? ids.has(String(eid)) : "n/a");
  console.log("compare:", r2.experiment?.compare);
  console.log("compare looks measurable:", /energy|mood|sleep|tomorrow|next day|feel/i.test(r2.experiment?.compare || ""));
}
