"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Mail } from "lucide-react";
import { login } from "@/app/auth/actions";
import { initialLoginState } from "@/lib/validation/auth";
import styles from "@/app/page.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? <LoaderCircle className={styles.spinner} size={18} /> : null}
      {pending ? "Enviando" : "Recibir enlace de acceso"}
      {!pending ? <Mail size={18} /> : null}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(login, initialLoginState);

  return (
    <form className={styles.form} action={action} noValidate>
      <label htmlFor="email">Correo autorizado</label>
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

      {state.message ? (
        <p
          className={state.status === "success" ? styles.formSuccess : styles.formError}
          role={state.status === "success" ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
      <p className={styles.magicNote}>Sin contraseña. El enlace caduca y sólo puede usarse una vez.</p>
    </form>
  );
}
