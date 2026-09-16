"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserDb, configured } from "@/lib/supabase/client";
import { Notice } from "@/components/common";
import { useSession } from "@/components/shell";
import { DigestPreference } from "@/components/notifications";

type Mode = "login" | "signup" | "reset" | "password";
const titles: Record<Mode, string> = {
  login: "Inicia sesión",
  signup: "Crea tu cuenta",
  reset: "Recupera tu contraseña",
  password: "Elige una contraseña nueva",
};

const authMessage = (m: string) =>
  /invalid login credentials/i.test(m) ? "Correo o contraseña incorrectos."
  : /email not confirmed/i.test(m) ? "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada."
  : /already registered|already been registered/i.test(m) ? "Ya existe una cuenta con ese correo."
  : /password/i.test(m) && /(weak|characters|least)/i.test(m) ? "La contraseña debe tener al menos 8 caracteres, con letras y números."
  : /rate limit|too many/i.test(m) ? "Demasiados intentos. Espera unos minutos."
  : "No se pudo completar la solicitud. Inténtalo de nuevo.";

export default function Account() {
  const router = useRouter();
  const { user, ready } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" | "info" } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get("modo") === "nueva-clave") setMode("password");
    if (params.get("modo") === "registro") setMode("signup");
    if (params.get("error")) setMessage({ text: "El enlace no es válido o caducó. Solicita uno nuevo.", tone: "error" });
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const db = browserDb();
    const callback = (next: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    try {
      if (mode === "signup") {
        const { data, error } = await db.auth.signUp({ email, password, options: { data: { name: String(f.get("name")).trim() }, emailRedirectTo: callback("/perfil") } });
        if (error) throw error;
        if (data.session) router.push("/");
        else setMessage({ text: `Te enviamos un correo para confirmar tu cuenta a ${email}. Llega de «Istmo» con el asunto «Confirma tu cuenta en Istmo». Abre el enlace para empezar; si no lo ves en unos minutos, revisa la carpeta de spam o promociones.`, tone: "ok" });
      } else if (mode === "reset") {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: callback("/cuenta?modo=nueva-clave") });
        if (error) throw error;
        setMessage({ text: "Si existe una cuenta con ese correo, recibirás un enlace de «Istmo» para restablecer la contraseña. Revisa también spam o promociones.", tone: "ok" });
      } else if (mode === "password") {
        const { error } = await db.auth.updateUser({ password });
        if (error) throw error;
        setMessage({ text: "Contraseña actualizada.", tone: "ok" });
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setMessage({ text: authMessage(err instanceof Error ? err.message : ""), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const switchTo = (m: Mode) => { setMode(m); setMessage(null); };

  return (
    <div className="page narrow" style={{ maxWidth: 520 }}>
      <p className="eyebrow">Tu cuenta</p>
      <h1>{titles[mode]}</h1>
      <p className="muted">Explorar es libre. Con una cuenta puedes proponer, apoyar, comentar, republicar y enviar tus propuestas.</p>
      {mode === "password" && ready && !user && <Notice tone="warn" message="Abre el enlace que te enviamos por correo para poder cambiar la contraseña." />}
      {user && mode === "login" && (
        <Notice message={`Ya iniciaste sesión como ${user.email}.`} />
      )}
      {user && mode !== "password" && <DigestPreference />}
      <form className="card form-card" onSubmit={submit}>
        {mode === "signup" && (
          <label className="field">Nombre público<input name="name" required minLength={2} maxLength={80} autoComplete="name" /><span className="hint">Se mostrará en tus propuestas y comentarios. Tu correo no será público.</span></label>
        )}
        {mode !== "password" && (
          <label className="field">Correo electrónico<input name="email" type="email" required autoComplete="email" /></label>
        )}
        {mode !== "reset" && (
          <label className="field">
            {mode === "password" ? "Nueva contraseña" : "Contraseña"}
            <input name="password" type="password" required minLength={8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            {mode !== "login" && <span className="hint">Mínimo 8 caracteres, con letras y números.</span>}
          </label>
        )}
        {mode === "signup" && (
          <label className="check"><input type="checkbox" required /><span>Acepto los <Link href="/terminos">términos</Link> y he leído la <Link href="/privacidad">política de privacidad</Link>.</span></label>
        )}
        {message && <Notice message={message.text} tone={message.tone} />}
        {!configured && <Notice tone="warn" message="Las cuentas requieren configurar la base de datos en este entorno." />}
        <button className="button primary" style={{ width: "100%" }} disabled={busy || !configured}>
          {busy ? "Un momento…" : mode === "signup" ? "Crear cuenta" : mode === "reset" ? "Enviar enlace" : mode === "password" ? "Guardar contraseña" : "Iniciar sesión"}
        </button>
      </form>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        {mode === "login" ? (
          <>
            <button className="text-button" onClick={() => switchTo("signup")}>Crear una cuenta</button>
            <button className="text-button" onClick={() => switchTo("reset")}>Olvidé mi contraseña</button>
          </>
        ) : (
          <button className="text-button" onClick={() => switchTo("login")}>Volver a iniciar sesión</button>
        )}
        {user && mode !== "password" && <button className="text-button" onClick={() => switchTo("password")}>Cambiar contraseña</button>}
      </div>
    </div>
  );
}
