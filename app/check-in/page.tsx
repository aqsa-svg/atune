import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getTodayData } from "@/lib/data";
import { CheckinForm } from "@/components/checkin/checkin-form";

export default async function CheckInPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const { onboarded, habits, log, doneHabitIds } = await getTodayData(user.id);
  if (!onboarded) redirect("/onboarding");
  return <CheckinForm habits={habits} initial={log} doneHabitIds={doneHabitIds} />;
}
