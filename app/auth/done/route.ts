import { NextResponse, type NextRequest } from "next/server";
import { verifyAccess } from "@/lib/auth";
import { upsertUser, isOnboarded } from "@/lib/data";

/**
 * OAuth callback. Cohesivity redirects here with tokens in the query string.
 * We store them as httpOnly cookies (Safari drops localStorage after OAuth
 * redirects), mirror the user locally, then route to onboarding or Today.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const access = sp.get("access_token");
  const refresh = sp.get("refresh_token");
  const returnTo = sp.get("return_to") || "/today";
  const error = sp.get("error");

  if (error || !access) {
    const url = new URL("/", req.url);
    if (error) url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  }

  const user = await verifyAccess(access);
  let dest = returnTo;
  if (user) {
    await upsertUser(user);
    dest = (await isOnboarded(user.id)) ? returnTo : "/onboarding";
  }

  const res = NextResponse.redirect(new URL(dest, req.url));
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("access_token", access, {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 3600,
  });
  if (refresh) {
    res.cookies.set("refresh_token", refresh, {
      httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 30 * 86400,
    });
  }
  return res;
}
