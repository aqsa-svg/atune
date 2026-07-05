// The never-fabricate gate — deliberately pure (no DB/Next imports) so it can be
// unit-tested in isolation. Code, not the prompt, is the final authority.

export type CoachExperiment = {
  action?: string;
  habit_id?: string;
  compare?: string;
};

export type CoachReply = {
  type?: "pattern" | "experiment" | "honest_fallback";
  enough_data?: boolean;
  insight?: string;
  evidence?: string[];
  references_habits?: string[];
  experiment?: CoachExperiment | null;
};

export type GroundingContext = {
  habitNames: string[];
  habitIds: string[];
  dayCount: number;
};

/** A reference is legit if it matches a real habit by id OR by name (the model
 *  mixes the two); anything else is fabrication. */
function knownHabit(ref: string | undefined, ctx: GroundingContext): boolean {
  if (!ref) return false;
  const r = String(ref).trim().toLowerCase();
  return (
    ctx.habitIds.some((id) => id.toLowerCase() === r) ||
    ctx.habitNames.some((n) => n.toLowerCase() === r)
  );
}

/**
 * Accept a coach reply only if it's faithful to the data:
 *  - has usable insight text and a valid type,
 *  - every referenced habit actually exists,
 *  - a `pattern` needs >= 7 days AND evidence (code owns this boundary, not the model),
 *  - an `experiment` needs a real target habit plus an action and a measurable compare.
 */
export function isGrounded(reply: CoachReply | null, ctx: GroundingContext): boolean {
  if (!reply || typeof reply.insight !== "string" || !reply.insight.trim()) return false;

  const type = reply.type;
  if (type !== "pattern" && type !== "experiment" && type !== "honest_fallback") return false;

  for (const h of reply.references_habits ?? []) {
    if (!knownHabit(h, ctx)) return false;
  }

  if (type === "pattern") {
    if (ctx.dayCount < 7) return false;
    if (!Array.isArray(reply.evidence) || reply.evidence.length === 0) return false;
  } else if (type === "experiment") {
    const ex = reply.experiment;
    if (!ex || !knownHabit(ex.habit_id, ctx)) return false;
    if (!ex.action?.trim() || !ex.compare?.trim()) return false;
  }

  return true;
}
