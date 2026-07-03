import type { Habit } from "./data";

export type ParsedDay = {
  mood?: number;
  energy?: number;
  sleepHours?: number;
  doneHabitIds?: number[];
  undoneHabitIds?: number[];
};

// Rough, honest heuristics — it only maps words the user actually wrote, and the
// result pre-fills controls the user confirms before saving. Upgraded to a Claude
// call once ANTHROPIC_API_KEY is wired (step 7).
const SYNONYMS: Record<string, string[]> = {
  workout: ["workout", "gym", "exercise", "lift", "training", "run"],
  walk: ["walk", "walked", "steps", "stroll"],
  meditate: ["meditate", "meditated", "meditation", "breathe"],
  water: ["water", "hydrate", "hydrated"],
  read: ["read", "reading", "book"],
  sleep: ["sleep", "slept", "bed"],
  journal: ["journal", "journaled", "wrote", "writing"],
};

function keywordsFor(name: string): string[] {
  const base = name.toLowerCase().replace(/^(no |drink |do )/, "").split(" ")[0];
  return SYNONYMS[base] ?? [base];
}

export function parseDayText(text: string, habits: Habit[]): ParsedDay {
  const t = ` ${text.toLowerCase()} `;
  const out: ParsedDay = {};

  // sleep hours
  const hm = t.match(/(\d+(?:\.\d+)?)\s*(?:h\b|hr|hrs|hour)/);
  if (hm) out.sleepHours = Math.min(16, parseFloat(hm[1]));
  else if (/slept (badly|poorly|terribly|awful|barely)|no sleep|couldn'?t sleep|bad sleep|barely slept/.test(t))
    out.sleepHours = 5;
  else if (/slept (well|great|good|deeply)|good sleep|great sleep|well[- ]rested|rested/.test(t))
    out.sleepHours = 8;

  // mood
  if (/(stressed|anxious|awful|terrible|sad|down|low|rough|miserable|overwhelmed|upset)/.test(t)) out.mood = 2;
  else if (/(great|amazing|happy|calm|content|relaxed|peaceful|good day|wonderful)/.test(t)) out.mood = 4;
  else if (/\b(ok|okay|fine|meh|alright|average)\b/.test(t)) out.mood = 3;

  // energy
  if (/(exhausted|drained|tired|wiped|no energy|sluggish|foggy|burnt out)/.test(t)) out.energy = 2;
  else if (/(energized|energetic|productive|focused|sharp|refreshed|great energy)/.test(t)) out.energy = 4;

  // habits — detect done vs skipped by nearby negation
  const done: number[] = [];
  const undone: number[] = [];
  for (const h of habits) {
    let hit = -1;
    for (const kw of keywordsFor(h.name)) {
      const idx = t.indexOf(kw);
      if (idx !== -1) {
        hit = idx;
        break;
      }
    }
    if (hit === -1) continue;
    const before = t.slice(Math.max(0, hit - 16), hit);
    if (/(skip|skipped|didn'?t|did not|\bno\b|missed|couldn'?t|forgot|failed to)/.test(before)) undone.push(h.id);
    else done.push(h.id);
  }
  if (done.length) out.doneHabitIds = done;
  if (undone.length) out.undoneHabitIds = undone;

  return out;
}
