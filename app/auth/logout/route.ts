import { NextResponse, type NextRequest } from "next/server";
import { logoutToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const refresh = req.cookies.get("refresh_token")?.value;
  if (refresh) await logoutToken(refresh);
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.delete("access_token");
  res.cookies.delete("refresh_token");
  res.cookies.delete("attune_demo");
  return res;
}
