import { NextResponse, type NextRequest } from "next/server";

const AUTH = `${process.env.COHESIVITY_BASE ?? "https://cohesivity.ai"}/edge/auth/${process.env.COH_TENANT_ID}`;

/**
 * Gate the app routes (Next 16 "proxy" convention, formerly middleware).
 * Access-token cookies live 1h; when one expires the browser drops it, so an
 * absent access token + present refresh token means "silently mint a fresh
 * pair." No valid session → back to the landing page.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.cookies.get("attune_demo")?.value === "1") return NextResponse.next();
  if (req.cookies.get("access_token")?.value) return NextResponse.next();

  const refresh = req.cookies.get("refresh_token")?.value;
  if (refresh) {
    try {
      const r = await fetch(`${AUTH}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "attune/1" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      const d = (await r.json()) as { access_token?: string; refresh_token?: string };
      if (d?.access_token && d.refresh_token) {
        const res = NextResponse.next();
        const secure = process.env.NODE_ENV === "production";
        res.cookies.set("access_token", d.access_token, {
          httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 3600,
        });
        res.cookies.set("refresh_token", d.refresh_token, {
          httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 30 * 86400,
        });
        return res;
      }
    } catch {
      // fall through to redirect
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/today/:path*",
    "/onboarding/:path*",
    "/check-in/:path*",
    "/insights/:path*",
    "/settings/:path*",
  ],
};
