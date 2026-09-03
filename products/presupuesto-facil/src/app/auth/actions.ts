"use server";

import { redirect } from "next/navigation";
import { clearOwnerEmail, setOwnerEmail } from "@/lib/session";
import { loginSchema, type LoginState } from "@/lib/validation/auth";

/**
 * Demo mode: the email is the identity. No magic link, no password, no wait on
 * email delivery. Everything that email owns is scoped to it in the database.
 */
export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos introducidos.",
      fields: parsed.error.flatten().fieldErrors,
    };
  }

  await setOwnerEmail(parsed.data.email);
  redirect("/dashboard");
}

export async function logout() {
  await clearOwnerEmail();
  redirect("/");
}
