"use server";

import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginState } from "@/lib/validation/auth";

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

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${getAppUrl()}/auth/callback`,
      },
    });

    if (error) {
      return {
        status: "error",
        message: "No hemos podido enviar el enlace. Inténtalo de nuevo en un minuto.",
      };
    }
  } catch {
    return {
      status: "error",
      message: "El acceso aún no está disponible en este entorno.",
    };
  }

  return {
    status: "success",
    message: "Revisa tu correo. Te hemos enviado un enlace de acceso de un solo uso.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
