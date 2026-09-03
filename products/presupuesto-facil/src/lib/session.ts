import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Demo sessions. The email typed at the door is the identity, kept in a cookie
 * and passed to the database functions that scope every query to it.
 *
 * This is deliberately not an authentication boundary: anyone who types an
 * email sees that email's quotes. It exists so the whole loop can be exercised
 * without email delivery. Slice 0's magic link is the real door and it is still
 * in the history, ready to come back.
 */

export const SESSION_COOKIE = "pf_owner";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

export async function setOwnerEmail(email: string) {
  const store = await cookies();

  store.set(SESSION_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_IN_SECONDS,
  });
}

export async function clearOwnerEmail() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getOwnerEmail() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export const requireOwnerEmail = cache(async (): Promise<string> => {
  const email = await getOwnerEmail();

  if (!email) {
    redirect("/?access=required");
  }

  return email;
});
