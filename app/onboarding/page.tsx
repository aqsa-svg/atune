import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isOnboarded } from "@/lib/data";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (await isOnboarded(user.id)) redirect("/today");
  return <OnboardingFlow name={user.name} />;
}
