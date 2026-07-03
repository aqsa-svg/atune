"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { setTier } from "@/lib/subscription";

export async function upgradeToPremium(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const plan = String(formData.get("plan") ?? "yearly");

  // When STRIPE_SECRET_KEY is configured, this is where we'd create a Stripe
  // Checkout session and redirect to it; the webhook then flips the tier.
  // Until keys exist, unlock in test mode so the premium experience is reviewable.
  await setTier(user.id, "premium", `test:${plan}`);
  redirect("/insights");
}

// Test helper so the free ⇄ premium states are both reviewable without Stripe.
export async function switchToFree(): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  await setTier(user.id, "free", "test");
  redirect("/insights");
}
