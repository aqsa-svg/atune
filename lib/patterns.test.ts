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
    // habit patterns ship a compare chart the UI can render
    const walk = r.patterns.find((p) => /walk/i.test(p.title));
    expect(walk?.viz?.kind).toBe("compare");
  });

  it("detects a next-day (lag) sleep→energy effect", () => {
    // Alternate: good sleep one night, then higher energy the *next* day.
    const logs: Log[] = [];
    for (let i = 0; i < 12; i++) {
      const day = `2026-06-${String(10 + i).padStart(2, "0")}`;
      const sleptWell = i % 2 === 0; // even days: slept well
      // energy tracks the PREVIOUS night's sleep, not today's
      const energy = i > 0 && (i - 1) % 2 === 0 ? 5 : 2;
      logs.push({ day, dowFull: "Wednesday", mood: 3, energy, sleep: sleptWell ? 8 : 5 });
    }
    const r = detectPatterns(makeData(logs));
    expect(r.enough).toBe(true);
    expect(r.patterns.some((p) => /next day/i.test(p.title))).toBe(true);
  });

  it("detects an upward energy trend over a couple of weeks", () => {
    // 15 days, energy climbing from ~2 to ~5.
    const logs: Log[] = Array.from({ length: 15 }, (_, i) => ({
      day: `2026-06-${String(1 + i).padStart(2, "0")}`,
      dowFull: "Friday",
      mood: 3,
      energy: Math.min(5, 2 + Math.round(i / 4)),
      sleep: 7,
    }));
    const r = detectPatterns(makeData(logs));
    const trend = r.patterns.find((p) => p.viz?.kind === "trend");
    expect(trend).toBeTruthy();
    expect(/trending up/i.test(trend!.title)).toBe(true);
  });
});
