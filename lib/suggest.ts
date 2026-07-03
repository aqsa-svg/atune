import { labelForLow } from "./options";
import type { Profile } from "./data";

/**
 * Day-one suggestion. There is no logged data yet, so this reflects back what
 * the user *told us* during onboarding — it never claims to have found a pattern.
 * That honesty is the point: the app earns the right to make data-driven claims
 * only once real check-ins exist.
 */
export function dayOneSuggestion(
  profile: Profile,
  habitNames: string[],
): { body: string; grounding: string } {
  const goals = profile.goals ?? [];
  const lows = profile.low_periods ?? [];
  const firstHabit = habitNames[0];

  let body: string;

  if (goals.includes("sleep") && profile.sleep_time) {
    body = `You told me better sleep matters most, and that you usually turn in around ${profile.sleep_time}. Tonight, try winding down just 20 minutes earlier — it's the smallest change that moves sleep the most.`;
  } else if (goals.includes("stress") && lows.length) {
    const when = lows.map(labelForLow).slice(0, 2).join(" and ").toLowerCase();
    body = `You mentioned ${when} tend to feel heaviest. This week, let's protect one small calm ritual for exactly those moments${
      firstHabit ? ` — starting with “${firstHabit}.”` : "."
    }`;
  } else if (goals.includes("focus")) {
    body = `You want sharper focus. From your very first check-in I'll start mapping when your energy actually peaks — so we can aim your hardest work at your best hours instead of guessing.`;
  } else if (goals.includes("move") && firstHabit) {
    body = `Moving more is the goal. Keep it almost embarrassingly small to start: just “${firstHabit},” every day this week. Consistency first, intensity later.`;
  } else if (firstHabit) {
    body = `Let's start with one thing you can actually keep: “${firstHabit}.” Check in each day and I'll begin learning your rhythm from there.`;
  } else {
    body = `Welcome. Check in each day — even 30 seconds — and I'll start to learn your rhythm. The insights get sharper with every day you log.`;
  }

  return {
    body,
    grounding: "Based on what you just told me — your real patterns come into focus after a few check-ins.",
  };
}
