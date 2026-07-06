"use server";

import { getSessionUser } from "@/lib/auth";
import { addHabit as addHabitData, type Habit } from "@/lib/data";

/** Add a habit inline (from the check-in screen) and return it so the client
 *  can show it as an already-selected chip. Returns null when there's no
 *  session or the name is empty. */
export async function addHabit(name: string): Promise<Habit | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return addHabitData(user.id, name);
}
