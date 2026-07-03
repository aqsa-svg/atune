"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { persistOnboarding, type OnboardingInput } from "@/lib/data";
import { dayOneSuggestion } from "@/lib/suggest";

export async function completeOnboarding(input: OnboardingInput): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  // The suggestion is derived from the answers we already have — no DB re-read.
  const suggestion = dayOneSuggestion(
    {
      wake_time: input.wakeTime,
      sleep_time: input.sleepTime,
      goals: input.goals,
      low_periods: input.lowPeriods,
    },
    input.habits.map((h) => h.name),
  );

  await persistOnboarding(user.id, input, suggestion);
  redirect("/today");
}
