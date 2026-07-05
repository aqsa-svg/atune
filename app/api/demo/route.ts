import { NextResponse, type NextRequest } from "next/server";
import { seedDemo } from "@/lib/demo";

// Enter the no-sign-in guest demo: (re)seed sample data, set the demo cookie,
// drop the user on Today.
export async function GET(req: NextRequest) {
  try {
    await seedDemo();
  } catch {
    // If seeding hiccups, still let them in — pages degrade gracefully.
  }
  const res = NextResponse.redirect(new URL("/today", req.url));
  res.cookies.set("attune_demo", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
  return res;
}
