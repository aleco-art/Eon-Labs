import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Introduce un correo válido.")),
});

export type LoginState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: {
    email?: string[];
  };
};

export const initialLoginState: LoginState = { status: "idle" };
