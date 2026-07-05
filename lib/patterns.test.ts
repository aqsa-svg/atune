import { describe, it, expect } from "vitest";
import { detectPatterns, type PatternData } from "./patterns";

type Log = PatternData["logs"][number];

function makeData(
  logs: Log[],
  dayHabits: Map<string, Set<number>> = new Map(),
  habits: { id: number; name: string }[] = [],
): PatternData {
  return { onboarded: true, logs, habits, dayHabits };
}

describe("detectPatterns", () => {
  it("won't surface patterns before ~7 days of data", () => {
    const logs: Log[] = Array.from({ length: 5 }, (_, i) => ({
      day: `2026-06-1${i}`,
      dowFull: "Monday",
      mood: 3,
      energy: 3,
      sleep: 7,
    }));
    const r = detectPatterns(makeData(logs));
    expect(r.enough).toBe(false);
    expect(r.patterns).toHaveLength(0);
  });

  it("detects a habit→energy pattern with enough data", () => {
    const habits = [{ id: 1, name: "Walk" }];
    const dayHabits = new Map<string, Set<number>>();
    const logs: Log[] = [];
    for (let i = 0; i < 10; i++) {
      const day = `2026-06-${10 + i}`;
      const walked = i % 2 === 0;
      logs.push({ day, dowFull: "Tuesday", mood: 3, energy: walked ? 5 : 2, sleep: 7 });
      if (walked) dayHabits.set(day, new Set([1]));
    }
    const r = detectPatterns(makeData(logs, dayHabits, habits));
    expect(r.enough).toBe(true);
    expect(r.patterns.some((p) => /walk/i.test(p.title))).toBe(true);
    // grounding must carry the real numbers
    expect(r.patterns.some((p) => /\d/.test(p.grounding))).toBe(true);
  });
});
