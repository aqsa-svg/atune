// Shared onboarding vocabulary — used by both the client flow and the
// server-side suggestion generator so slugs and labels never drift.

export const GOALS = [
  { slug: "sleep", label: "Sleep better" },
  { slug: "stress", label: "Less stress" },
  { slug: "focus", label: "More focus" },
  { slug: "move", label: "Move more" },
  { slug: "eat", label: "Eat better" },
  { slug: "present", label: "Be present" },
] as const;

export const LOW_PERIODS = [
  { slug: "monday", label: "Monday mornings" },
  { slug: "afternoons", label: "Afternoon slumps" },
  { slug: "evenings", label: "Evenings" },
  { slug: "weekends", label: "Weekends" },
  { slug: "after_work", label: "Right after work" },
] as const;

export const HABIT_SUGGESTIONS = [
  { name: "Sleep 7h", emoji: "😴" },
  { name: "Walk", emoji: "🚶" },
  { name: "Meditate", emoji: "🧘" },
  { name: "Drink water", emoji: "💧" },
  { name: "Read", emoji: "📖" },
  { name: "No screens before bed", emoji: "🌙" },
  { name: "Workout", emoji: "🏋️" },
  { name: "Journal", emoji: "✍️" },
] as const;

export function labelForGoal(slug: string): string {
  return GOALS.find((g) => g.slug === slug)?.label ?? slug;
}
export function labelForLow(slug: string): string {
  return LOW_PERIODS.find((l) => l.slug === slug)?.label ?? slug;
}
