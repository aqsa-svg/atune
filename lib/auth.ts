import { cookies } from "next/headers";
import { COHESIVITY_BASE, COH_TENANT, APP_URL } from "./env";

const AUTH = `${COHESIVITY_BASE}/edge/auth/${COH_TENANT}`;
const UA = { "Content-Type": "application/json", "User-Agent": "attune/1" };

export type SessionUser = {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
};

// Guest demo account — a fixed, out-of-range id so it can never collide with a
// real Cohesivity user id. Entered via /api/demo (no Google sign-in).
export const DEMO_USER_ID = -1;
export const DEMO_USER: SessionUser = {
  id: DEMO_USER_ID,
  email: "demo@attune.app",
  name: "Demo Explorer",
  picture: null,
};

/** Stateless JWT check via the edge. Never verify tokens locally. */
export async function verifyAccess(token: string): Promise<SessionUser | null> {
  try {
    const r = await fetch(`${AUTH}/verify`, {
      method: "POST",
      headers: UA,
      body: JSON.stringify({ access_token: token }),
      cache: "no-store",
    });
    const d = (await r.json()) as { valid?: boolean; user?: SessionUser };
    return d?.valid && d.user ? d.user : null;
  } catch {
    return null;
  }
}

export async function refreshTokens(
  refresh: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const r = await fetch(`${AUTH}/refresh`, {
      method: "POST",
      headers: UA,
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
    });
    const d = (await r.json()) as { access_token?: string; refresh_token?: string };
    return d?.access_token && d.refresh_token
      ? { access_token: d.access_token, refresh_token: d.refresh_token }
      : null;
  } catch {
    return null;
  }
}

export async function logoutToken(refresh: string): Promise<void> {
  try {
    await fetch(`${AUTH}/logout`, {
      method: "POST",
      headers: UA,
      body: JSON.stringify({ refresh_token: refresh }),
    });
  } catch {}
}

/** Read the current user from the access-token cookie (RSC / route / action safe). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  if (store.get("attune_demo")?.value === "1") return DEMO_USER;
  const access = store.get("access_token")?.value;
  if (!access) return null;
  return verifyAccess(access);
}

/** Build the "Continue with Google" URL, preserving where to land afterward. */
export function googleLoginUrl(returnTo = "/today"): string {
  const u = new URL(`${AUTH}/google`);
  u.searchParams.set("redirect_uri", `${APP_URL}/auth/done`);
  u.searchParams.set("return_to", returnTo);
  return u.toString();
}
