"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { dateLabel, notificationLine, type Notification } from "@/lib/domain";

/** Bell in the top bar: what other people did with this author's proposals. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones");
      if (!res.ok) return;
      const data = (await res.json()) as { items: Notification[]; unread: number };
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // A failed check is not worth interrupting the page for; the next one will tell.
    }
  }, []);

  useEffect(() => {
    // First look on mount, then a quiet check every minute while the tab is in front.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    return () => clearInterval(timer);
  }, [load]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    await load();
    if (!unread) return;
    setUnread(0);
    try {
      await fetch("/api/notificaciones", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    } catch {
      // Reading them again later will mark them.
    }
  }

  const label = unread ? `Novedades, ${unread} sin leer` : "Novedades";
  return (
    <div className="notif">
      <button className="notif-button" onClick={toggle} aria-label={label} aria-expanded={open}>
        <Bell size={18} />
        {unread > 0 && <span className="notif-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <button className="notif-backdrop" aria-label="Cerrar novedades" onClick={() => setOpen(false)} />
          <div className="notif-panel" role="dialog" aria-label="Novedades">
            <p className="notif-title">Novedades</p>
            {items.length === 0 ? (
              <p className="notif-empty">
                Todavía no hay movimiento en tus propuestas. Cuando alguien las apoye, firme, comente o republique,
                aparecerá aquí.
              </p>
            ) : (
              <ul className="notif-list">
                {items.map((n) => (
                  <li key={n.id} data-unread={n.read_at ? undefined : true}>
                    <Link
                      href={n.proposal_id ? "/propuesta/" + n.proposal_id + (n.comment_id ? "#comentarios" : "") : "/"}
                      onClick={() => setOpen(false)}
                    >
                      <span className="notif-line">{notificationLine(n.kind, n.actor_name)}</span>
                      {n.proposals?.title && <span className="notif-what">«{n.proposals.title}»</span>}
                      <span className="notif-when">{dateLabel(n.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link className="notif-foot" href="/cuenta" onClick={() => setOpen(false)}>
              Ajustar los avisos por correo
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

/** The only email we send on our own initiative, so the switch lives with the account. */
export function DigestPreference() {
  const [digest, setDigest] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/avisos/preferencias");
      if (!res.ok) return;
      const data = (await res.json()) as { digest: boolean };
      setDigest(data.digest);
    } catch {
      // Leave the switch hidden rather than show a wrong state.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function choose(value: boolean) {
    setDigest(value);
    setSaving(true);
    try {
      await fetch("/api/avisos/preferencias", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ digest: value }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (digest === null) return null;
  return (
    <div className="card form-card">
      <p className="eyebrow">Avisos por correo</p>
      <label className="check">
        <input type="checkbox" checked={digest} disabled={saving} onChange={(e) => void choose(e.target.checked)} />
        <span>
          Enviarme un <b>resumen diario</b> de lo que pasa en mis propuestas: apoyos, firmas, comentarios y
          republicaciones. Un solo correo al día, y solo si hubo movimiento.
        </span>
      </label>
      <p className="hint">
        Los correos de tu cuenta, como confirmar el correo o restablecer la contraseña, llegan siempre. Dentro de la
        plataforma verás las novedades en la campanita, tengas esto activado o no.
      </p>
    </div>
  );
}
