import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Anonymous reader for public pages: it can never see more than a visitor. */
export function publicDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
