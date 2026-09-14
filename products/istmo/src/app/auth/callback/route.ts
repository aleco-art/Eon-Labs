import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverDb } from "@/lib/supabase/server";

// Handles both link formats Supabase can send: PKCE (?code=) and token hash (?token_hash=&type=).
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const raw = params.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") ? raw : "/";
  const db = await serverDb();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  let ok = false;
  if (code) ok = !(await db.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await db.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  const destination = ok ? next : type === "recovery" || next.includes("nueva-clave") ? "/cuenta?modo=nueva-clave&error=enlace" : "/cuenta?error=enlace";
  return NextResponse.redirect(new URL(destination, req.url));
}
