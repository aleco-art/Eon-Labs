"use client";
import { useEffect, useState } from "react";
import { browserDb, configured } from "@/lib/supabase/client";
import { useSession } from "@/components/shell";
import { Notice } from "@/components/common";
import Link from "next/link";
type ReportRow = {
  id: string;
  proposal_id: string;
  comment_id: string | null;
  reason: string;
  resolved: boolean;
};
export default function Moderation() {
  const { user } = useSession();
  const [allowed, setAllowed] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    if (!configured || !user) return;
    const db = browserDb();
    const { data } = await db.rpc("is_moderator");
    setAllowed(Boolean(data));
    if (data) {
      const { data: r } = await db
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setReports(r ?? []);
    }
  }
  useEffect(() => {
    // Resolve database permissions and fetch the external moderation queue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="narrow-page">
      <p className="eyebrow">CUIDAR LA CONVERSACIÓN</p>
      <h1>Moderación de contenido</h1>
      <p className="muted">
        Esta herramienta gestiona abuso y spam. No aprueba propuestas.
      </p>
      <Notice message={message} />
      {!allowed ? (
        <p>Acceso exclusivo para administradores designados.</p>
      ) : (
        reports.map((r) => (
          <article className="form-card" key={r.id}>
            <Link href={"/propuesta/" + r.proposal_id}>Ver propuesta ↗</Link>
            <p>{r.reason}</p>
            <small>
              {r.comment_id ? "Reporte de comentario" : "Reporte de propuesta"}{" "}
              · {r.resolved ? "Resuelto" : "Pendiente"}
            </small>
            <div className="detail-actions">
              {["hide", "restore", "resolve"].map((action) => (
                <button
                  key={action}
                  className="button secondary"
                  onClick={async () => {
                    const response = await fetch("/api/moderation", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reportId: r.id, action }),
                    });
                    const result = await response.json();
                    setMessage(response.ok ? "Acción guardada." : result.error);
                    await load();
                  }}
                >
                  {action === "hide"
                    ? "Ocultar contenido"
                    : action === "restore"
                      ? "Restaurar contenido"
                      : "Marcar resuelto"}
                </button>
              ))}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
