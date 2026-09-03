import "server-only";

import { cookies } from "next/headers";

/**
 * A way into the internal area that does not depend on email delivery, so the
 * interface can be reviewed while magic links are being sorted out.
 *
 * It is off unless DEMO_ACCESS_KEY is set, and the cookie has to carry that
 * same secret on every request, so knowing the cookie name is not enough. This
 * is a testing aid: it grants no database access, because row level security
 * answers to the Supabase session and there is none here.
 *
 * Remove the variable in Vercel and the door closes immediately.
 */

export const DEMO_COOKIE = "pf_demo_access";

export function demoAccessKey() {
  const key = process.env.DEMO_ACCESS_KEY?.trim();
  return key && key.length >= 16 ? key : null;
}

export async function hasDemoAccess() {
  const key = demoAccessKey();

  if (!key) {
    return false;
  }

  const store = await cookies();
  return store.get(DEMO_COOKIE)?.value === key;
}
