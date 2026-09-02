import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Introduce un correo válido.")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export type LoginState = {
  status: "idle" | "error";
  message?: string;
  fields?: {
    email?: string[];
    password?: string[];
  };
};

export const initialLoginState: LoginState = { status: "idle" };
