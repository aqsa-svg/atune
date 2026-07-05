import { describe, it, expect } from "vitest";
import { isGrounded } from "./grounding";

const ctx = (habitNames: string[], habitIds: string[], dayCount: number) => ({
  habitNames,
  habitIds,
  dayCount,
});

describe("isGrounded (never-fabricate gate)", () => {
  it("accepts a well-supported pattern at >= 7 days", () => {
    expect(
      isGrounded(
        {
          type: "pattern",
          enough_data: true,
          insight: "Walking moves your energy more than sleep does.",
          evidence: ["avg energy 4.0 on walk days vs 2.9 without"],
          references_habits: ["Walk"],
        },
        ctx(["Walk", "Sleep 7h"], ["1", "2"], 12),
      ),
    ).toBe(true);
  });

  it("rejects a pattern on fewer than 7 days (code owns the boundary)", () => {
    expect(
      isGrounded(
        { type: "pattern", insight: "Clear Monday dip.", evidence: ["energy 2"], references_habits: [] },
        ctx(["Walk"], ["1"], 5),
      ),
    ).toBe(false);
  });

  it("accepts a valid experiment tied to a real habit", () => {
    expect(
      isGrounded(
        {
          type: "experiment",
          enough_data: false,
          insight: "Let's test whether Sleep 7h shifts your energy.",
          evidence: ["3 days logged"],
          references_habits: ["2"],
          experiment: { action: "Complete Sleep 7h tonight.", habit_id: "2", compare: "does energy rise tomorrow" },
        },
        ctx(["Walk", "Sleep 7h"], ["1", "2"], 3),
      ),
    ).toBe(true);
  });

  it("rejects an experiment whose habit_id isn't a real habit", () => {
    expect(
      isGrounded(
        {
          type: "experiment",
          insight: "Try running.",
          references_habits: [],
          experiment: { action: "Run today.", habit_id: "999", compare: "energy tomorrow" },
        },
        ctx(["Walk"], ["1"], 3),
      ),
    ).toBe(false);
  });

  it("rejects an experiment missing a measurable compare", () => {
    expect(
      isGrounded(
        {
          type: "experiment",
          insight: "Try walking.",
          references_habits: [],
          experiment: { action: "Walk today.", habit_id: "1", compare: "" },
        },
        ctx(["Walk"], ["1"], 3),
      ),
    ).toBe(false);
  });

  it("accepts habit references by name OR id", () => {
    const c = ctx(["Walk"], ["1"], 10);
    expect(isGrounded({ type: "pattern", insight: "x", evidence: ["e"], references_habits: ["Walk"] }, c)).toBe(true);
    expect(isGrounded({ type: "pattern", insight: "x", evidence: ["e"], references_habits: ["1"] }, c)).toBe(true);
    expect(isGrounded({ type: "pattern", insight: "x", evidence: ["e"], references_habits: ["Run"] }, c)).toBe(false);
  });

  it("allows honest_fallback with no evidence", () => {
    expect(
      isGrounded(
        { type: "honest_fallback", insight: "Not enough yet — log your first day.", evidence: [], references_habits: [] },
        ctx([], [], 0),
      ),
    ).toBe(true);
  });

  it("rejects empty insight, unknown type, or null", () => {
    expect(isGrounded({ type: "pattern", insight: "", evidence: ["e"], references_habits: [] }, ctx([], [], 9))).toBe(false);
    expect(isGrounded({ type: "mystery" as never, insight: "x" }, ctx([], [], 9))).toBe(false);
    expect(isGrounded(null, ctx([], [], 9))).toBe(false);
  });
});
