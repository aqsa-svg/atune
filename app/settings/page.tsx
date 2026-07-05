import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const { profile, habits } = await getSettings(user.id);
  if (!profile) redirect("/onboarding");
  return <SettingsForm profile={profile} habits={habits} />;
}
