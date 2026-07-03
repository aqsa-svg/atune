"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { saveCheckin, type CheckinInput } from "@/lib/data";
import { generateDailyInsight } from "@/lib/coach";

export async function submitCheckin(input: CheckinInput): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  await saveCheckin(user.id, input);
  // Regenerate today's grounded insight from the fresh data — best-effort.
  try {
    await generateDailyInsight(user.id);
  } catch {}
  redirect("/today");
}
