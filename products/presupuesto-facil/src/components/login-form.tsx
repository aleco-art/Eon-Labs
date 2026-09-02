"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { login } from "@/app/auth/actions";
import { initialLoginState } from "@/lib/validation/auth";
import styles from "@/app/page.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? <LoaderCircle className={styles.spinner} size={18} /> : null}
      {pending ? "Validando" : "Entrar"}
      {!pending ? <ArrowRight size={18} /> : null}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(login, initialLoginState);

  return (
    <form className={styles.form} action={action} noValidate>
      <label htmlFor="email">Correo profesional</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="nombre@empresa.es"
        aria-invalid={Boolean(state.fields?.email)}
        aria-describedby={state.fields?.email ? "email-error" : undefined}
        required
      />
      {state.fields?.email ? <p className={styles.fieldError} id="email-error">{state.fields.email[0]}</p> : null}

      <label htmlFor="password">Contraseña</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Tu contraseña"
        aria-invalid={Boolean(state.fields?.password)}
        aria-describedby={state.fields?.password ? "password-error" : undefined}
        required
      />
      {state.fields?.password ? <p className={styles.fieldError} id="password-error">{state.fields.password[0]}</p> : null}

      {state.message ? <p className={styles.formError} role="alert">{state.message}</p> : null}
      <SubmitButton />
    </form>
  );
}
