"use client";
import { useState } from "react";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { Notice } from "./common";

/** Unsubscribing is a button, never the link itself: mail scanners open links on their own. */
export function Unsubscribe({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  async function stop() {
    setState("working");
    const res = await fetch("/api/avisos/baja", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done")
    return (
      <>
        <Notice tone="ok" message="Listo. Ya no recibirás el resumen diario." />
        <p>
          Puedes volver a activarlo cuando quieras desde <Link href="/cuenta">tu cuenta</Link>.
        </p>
      </>
    );

  return (
    <>
      {state === "error" && (
        <Notice tone="error" message="Este enlace ya no es válido. Cambia la preferencia desde tu cuenta." />
      )}
      <button className="button" onClick={stop} disabled={state === "working"}>
        <BellOff size={17} /> {state === "working" ? "Guardando…" : "Confirmar y dejar de recibirlo"}
      </button>
    </>
  );
}
