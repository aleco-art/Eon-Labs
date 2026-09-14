"use client";
import { useState } from "react";
import { browserDb, configured } from "@/lib/supabase/client";
import { Notice } from "@/components/common";
import { useSession } from "@/components/shell";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function Account() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useSession();
  return (
    <div className="narrow-page">
      <p className="eyebrow">TU ESPACIO EN ISTMO</p>
      <h1>
        {mode === "signup"
          ? "Hagamos espacio a tu voz."
          : mode === "reset"
            ? "Recupera tu cuenta."
            : mode === "password"
              ? "Tu nueva contraseña."
              : "Qué bueno verte por aquí."}
      </h1>
      <p className="muted">Una cuenta propia. Una comunidad compartida.</p>
      {user && (
        <p>
          <Link href={"/perfil/" + user.id}>Ir a mi perfil</Link> ·{" "}
          <button className="text-button" onClick={() => setMode("password")}>
            Cambiar contraseña
          </button>
        </p>
      )}
      <form
        className="form-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const f = new FormData(e.currentTarget);
            const email = String(f.get("email") ?? "");
            const password = String(f.get("password") ?? "");
            const db = browserDb();
            const result =
              mode === "signup"
                ? await db.auth.signUp({
                    email,
                    password,
                    options: {
                      data: { name: f.get("name") },
                      emailRedirectTo: location.origin + "/auth/callback",
                    },
                  })
                : mode === "reset"
                  ? await db.auth.resetPasswordForEmail(email, {
                      redirectTo:
                        location.origin + "/auth/callback?next=/cuenta",
                    })
                  : mode === "password"
                    ? await db.auth.updateUser({ password })
                    : await db.auth.signInWithPassword({ email, password });
            if (result.error) throw result.error;
          if (mode === "login") router.push("/");
            else
              setMessage(
                mode === "signup"
                  ? "Revisa tu correo para confirmar tu cuenta."
                  : mode === "reset"
                    ? "Si existe una cuenta con ese correo, recibirás un enlace para recuperarla."
                    : "Contraseña actualizada.",
              );
          } catch (err) {
            setMessage(
              err instanceof Error
                ? err.message
                : "No se pudo completar la solicitud.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "signup" && (
          <label>
            Nombre público
            <input
              name="name"
              minLength={2}
              maxLength={80}
              autoComplete="name"
              required
            />
          </label>
        )}
        {mode !== "password" && (
          <label>
            Correo electrónico
            <input name="email" type="email" autoComplete="email" required />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
            />
          </label>
        )}
        {mode === "signup" && (
          <label className="checkbox">
            <input type="checkbox" required />
            <span>
              Acepto los <Link href="/terminos">términos</Link> y he leído la{" "}
              <Link href="/privacidad">privacidad</Link>.
            </span>
          </label>
        )}
        <button className="button primary" disabled={busy || !configured}>
          {busy
            ? "Un momento…"
            : mode === "signup"
              ? "Crear mi cuenta"
              : mode === "reset"
                ? "Enviar enlace"
                : mode === "password"
                  ? "Guardar contraseña"
                  : "Iniciar sesión"}
        </button>
        {!configured && (
          <Notice message="Las cuentas todavía no están habilitadas. Estamos preparando la plataforma." />
        )}
        <Notice message={message} />
      </form>
      <div className="account-options">
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setMessage("");
          }}
        >
          {mode === "signup" ? "Ya tengo una cuenta" : "Crear una cuenta"}
        </button>
        <button
          className="text-button"
          onClick={() => {
            setMode("reset");
            setMessage("");
          }}
        >
          Olvidé mi contraseña
        </button>
      </div>
    </div>
  );
}
