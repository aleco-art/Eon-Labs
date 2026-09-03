import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { HashSession } from "./hash-session";

/**
 * Supabase can hand the session back in three different shapes, and a magic
 * link that works in one project fails in another depending on the flow and the
 * email template:
 *
 *   PKCE      -> ?code=...
 *   OTP hash  -> ?token_hash=...&type=magiclink | email | recovery | ...
 *   Implicit  -> #access_token=...&refresh_token=...
 *
 * The fragment never reaches the server, so that last one has to be finished in
 * the browser. Accepting all three is what makes the link work rather than
 * bouncing the user back to the landing page.
 */

export const dynamic = "force-dynamic";

const OTP_TYPES: EmailOtpType[] = [
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
];

function asOtpType(value: string | undefined): EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType) ? (value as EmailOtpType) : "email";
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthCallbackPage(props: PageProps<"/auth/callback">) {
  const params = await props.searchParams;
  const code = first(params.code);
  const tokenHash = first(params.token_hash);
  const type = first(params.type);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      redirect("/dashboard");
    }
  }

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: asOtpType(type),
    });

    if (!error) {
      redirect("/dashboard");
    }
  }

  return <HashSession />;
}
