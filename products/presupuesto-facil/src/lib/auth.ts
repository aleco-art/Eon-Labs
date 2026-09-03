import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasDemoAccess } from "@/lib/demo-access";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  businessName: string | null;
};

export const requireUser = cache(async (): Promise<CurrentUser> => {
  // Reviewing the interface must not depend on email delivery. This carries no
  // Supabase session, so row level security still returns nothing.
  if (await hasDemoAccess()) {
    return {
      id: "demo",
      email: "demo@eonlabs.test",
      fullName: "Acceso de prueba",
      businessName: "Eon Labs (demo)",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;

  if (error || !id) {
    redirect("/?access=required");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name")
    .eq("id", id)
    .maybeSingle();

  return {
    id,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
    fullName: profile?.full_name ?? null,
    businessName: profile?.business_name ?? null,
  };
});
