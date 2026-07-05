"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { updateSettings, type OnboardingInput } from "@/lib/data";

export async function saveSettings(input: OnboardingInput): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  await updateSettings(user.id, input);
  redirect("/today");
}
