"use server";

import { redirect } from "next/navigation";
import { getSessionUser, DEMO_USER_ID } from "@/lib/auth";
import { saveCheckin, type CheckinInput } from "@/lib/data";
import { generateDailyInsight } from "@/lib/coach";

export async function submitCheckin(input: CheckinInput): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  await saveCheckin(user.id, input);

  // Generate the grounded insight synchronously so Today shows the FRESH insight
  // the moment you land — the check-in button's "Reading your day…" state covers
  // the wait. Skipped for the shared demo account so guests never spend AI quota.
  if (user.id !== DEMO_USER_ID) {
    try {
      await generateDailyInsight(user.id);
    } catch {}
  }

  redirect("/today");
}
