import { describe, it, expect } from "vitest";
import { parseDayText } from "./parse";
import type { Habit } from "./data";

const habits: Habit[] = [
  { id: 1, name: "Walk", emoji: null, sort: 0 },
  { id: 2, name: "Workout", emoji: null, sort: 1 },
  { id: 3, name: "Meditate", emoji: null, sort: 2 },
];

describe("parseDayText (quick-fill)", () => {
  it("parses 'slept badly, skipped the gym, felt stressed'", () => {
    const p = parseDayText("slept badly, skipped the gym, felt stressed", habits);
    expect(p.sleepHours).toBeLessThanOrEqual(6);
    expect(p.mood).toBe(2);
    expect(p.undoneHabitIds).toContain(2); // "gym" → Workout, negated by "skipped"
  });

  it("parses explicit hours and a completed habit", () => {
    const p = parseDayText("slept 8 hours and went for a walk, felt great", habits);
    expect(p.sleepHours).toBe(8);
    expect(p.doneHabitIds).toContain(1); // Walk, done
    expect(p.mood).toBe(4);
  });

  it("extracts nothing from unrelated text", () => {
    const p = parseDayText("the weather was cloudy today", habits);
    expect(p.mood).toBeUndefined();
    expect(p.doneHabitIds).toBeUndefined();
    expect(p.undoneHabitIds).toBeUndefined();
  });
});
