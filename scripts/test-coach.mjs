// One-off: exercises the coach prompt + grounding gate against real thin data.
import { readFileSync } from "node:fs";
const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const KEY = env.COH_APP_KEY;
const BASE = env.COHESIVITY_BASE || "https://cohesivity.ai";

const data = {
  goals: ["Less stress", "Eat better", "More focus", "Sleep better"],
  lowPeriods: ["Weekends"],
  usualWake: "07:00",
  usualSleep: "23:00",
  habitNames: ["Drink water", "No screens before bed", "Walk"],
  habitTotal: 3,
  checkinDays: 1,
  logs: [{ day: "2026-07-03", dow: "Fri", mood: 2, energy: 3, sleep: 7, habitsDone: 3 }],
};

const SYSTEM = `You are Attune, a calm, precise wellness companion.
You produce exactly ONE short insight (1–2 sentences, warm, specific, second person).
Hard rules — this is the whole point of the product:
- Reference ONLY facts present in DATA. Never invent numbers, studies, averages, or patterns.
- If there are fewer than 4 days of check-ins, you MUST NOT claim any multi-day pattern. Instead give a grounded nudge about what little is logged and that you're still learning.
- Any habit you name must appear in DATA.habitNames verbatim.
Return ONLY a JSON object, no prose.`;

const user = `DATA:
${JSON.stringify(data, null, 2)}

Return JSON with this exact shape:
{
  "enough_data": boolean,
  "insight": string,
  "evidence": string[],
  "references_habits": string[]
}`;

const res = await fetch(`${BASE}/edge/ai-gateway/v1/chat/completions?key=${encodeURIComponent(KEY)}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "User-Agent": "attune/1" },
  body: JSON.stringify({
    model: "anthropic/claude-haiku-4.5",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    max_tokens: 400,
    temperature: 0.4,
  }),
});
console.log("HTTP", res.status);
const j = await res.json();
const content = j.choices?.[0]?.message?.content ?? JSON.stringify(j).slice(0, 300);
console.log("RAW REPLY:\n" + content);

const start = content.indexOf("{");
const end = content.lastIndexOf("}");
let p = null;
try {
  p = JSON.parse(content.slice(start, end + 1));
} catch {}
const names = new Set(data.habitNames.map((n) => n.toLowerCase()));
let grounded = !!p && typeof p.insight === "string" && p.insight.trim().length > 0;
for (const h of p?.references_habits ?? []) if (!names.has(String(h).toLowerCase())) grounded = false;
if (p?.enough_data === true && data.checkinDays < 4) grounded = false;
if (!Array.isArray(p?.evidence) || p.evidence.length === 0) grounded = false;

console.log("\nenough_data:", p?.enough_data, "| GROUNDING GATE PASSES:", grounded);
