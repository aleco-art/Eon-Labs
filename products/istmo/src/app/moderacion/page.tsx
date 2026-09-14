"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, configured } from "@/lib/supabase/client";
import { dateLabel } from "@/lib/domain";
import { useSession } from "@/components/shell";
import { Notice } from "@/components/common";

type Report = {
  id: string; proposal_id: string | null; comment_id: string | null; attachment_id: string | null; responsable_id: string | null;
  kind: string; reason: string; resolved: boolean; created_at: string;
};
type Log = { id: string; action: string; target_type: string; target_id: string; note: string | null; created_at: string };

const actionLabels: Record<string, string> = {
  hide: "Ocultar", restore: "Restaurar", resolve: "Cerrar sin cambios", dismiss: "Descartar", flag_entry: "Marcar dato para revisión",
};

export default function Moderation() {
  const { user, ready, isModerator } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [log, setLog] = useState<Log[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const load = useCallback(async () => {
    if (!configured || !isModerator) return;
    const db = browserDb();
    let q = db.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (!showResolved) q = q.eq("resolved", false);
    const [r, l] = await Promise.all([q, db.from("moderation_log").select("*").order("created_at", { ascending: false }).limit(30)]);
    setReports((r.data as Report[]) ?? []);
    setLog((l.data as Log[]) ?? []);
  }, [isModerator, showResolved]);

  useEffect(() => {
    // The moderation queue is read from the database with moderator permissions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (!ready) return <p className="page loading">Cargando…</p>;
  if (!user || !isModerator)
    return (
      <div className="page narrow">
        <div className="empty"><h1>Acceso restringido</h1><p>Esta sección es solo para moderadores designados.</p></div>
      </div>
    );

  async function act(reportId: string, action: string) {
    const r = await fetch("/api/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId, action }) });
    const data = await r.json();
    setMessage(r.ok ? { text: "Acción registrada.", tone: "ok" } : { text: data.error, tone: "error" });
    await load();
  }

  return (
    <div className="page narrow">
      <p className="eyebrow">Moderación</p>
      <h1>Reportes de la comunidad</h1>
      <p className="muted">Aquí se gestionan spam, abuso, archivos inapropiados y datos incorrectos del directorio. La moderación no evalúa ni aprueba el mérito de las propuestas.</p>
      <label className="check"><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Mostrar reportes cerrados</label>
      {message && <Notice message={message.text} tone={message.tone} />}
      {reports.map((r) => {
        const type = r.attachment_id ? "Archivo" : r.comment_id ? "Comentario" : r.responsable_id ? "Dato del directorio" : "Propuesta";
        const actions = r.responsable_id ? ["flag_entry", "dismiss"] : ["hide", "restore", "dismiss"];
        return (
          <article className="card form-card" key={r.id}>
            <div className="meta">
              <span className="tag">{type}</span>
              <span>{dateLabel(r.created_at)}</span>
              <span className={"badge " + (r.resolved ? "manual" : "level")}>{r.resolved ? "Cerrado" : "Pendiente"}</span>
            </div>
            <p style={{ margin: "10px 0", whiteSpace: "pre-wrap" }}>{r.reason}</p>
            <p className="hint">
              {r.proposal_id && <Link className="text-button" href={"/propuesta/" + r.proposal_id} target="_blank">Ver propuesta</Link>}
              {r.responsable_id && <Link className="text-button" href="/responsables" target="_blank">Directorio ({r.responsable_id})</Link>}
              {r.attachment_id && <> · <a className="text-button" href={"/api/archivo/" + r.attachment_id} target="_blank" rel="noreferrer">Abrir archivo</a></>}
            </p>
            <div className="toolbar">
              {actions.map((a) => <button key={a} className={"button small " + (a === "hide" ? "danger" : "secondary")} onClick={() => act(r.id, a)}>{actionLabels[a]}</button>)}
            </div>
          </article>
        );
      })}
      {!reports.length && <p className="muted">No hay reportes {showResolved ? "" : "pendientes"}.</p>}
      <h2 className="section-title">Últimas acciones</h2>
      {log.map((l) => (
        <div className="delivery" key={l.id}><span>{actionLabels[l.action] ?? l.action} · {l.target_type}</span><small className="muted">{dateLabel(l.created_at)}</small></div>
      ))}
      {!log.length && <p className="muted">Sin acciones registradas.</p>}
    </div>
  );
}
