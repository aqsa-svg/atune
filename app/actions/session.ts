"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logoutToken } from "@/lib/auth";

/**
 * Sign out via POST — never a GET link. A GET logout route gets fired by
 * Next's <Link> prefetch when the link sits in the viewport, silently ending
 * the session. As a POST server action it only runs on a real click. Revokes
 * the refresh token, clears cookies, and returns to the landing page.
 */
export async function logout() {
  const store = await cookies();
  const refresh = store.get("refresh_token")?.value;
  if (refresh) await logoutToken(refresh);
  store.delete("access_token");
  store.delete("refresh_token");
  store.delete("attune_demo");
  redirect("/");
}
