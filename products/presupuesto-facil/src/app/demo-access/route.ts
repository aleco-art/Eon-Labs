import { NextResponse } from "next/server";
import { DEMO_COOKIE, demoAccessKey } from "@/lib/demo-access";

/**
 * /demo-access?key=... opens the internal area for review without an email.
 * Returns 404 when DEMO_ACCESS_KEY is unset, so the route does not even
 * announce itself in an environment where the door is closed.
 */

export const dynamic = "force-dynamic";

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

export async function GET(request: Request) {
  const key = demoAccessKey();

  if (!key) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);

  if (url.searchParams.get("key") !== key) {
    return new NextResponse("Not found", { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/dashboard", url.origin));

  response.cookies.set(DEMO_COOKIE, key, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY_IN_SECONDS,
  });

  return response;
}
