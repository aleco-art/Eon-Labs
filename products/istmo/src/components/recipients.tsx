"use client";
import { useEffect, useState } from "react";
import { type Contact, type Proposal, dateLabel } from "@/lib/domain";
import { Notice } from "./common";
import { browserDb } from "@/lib/supabase/client";
type Job = {
  id: string;
  status: string;
  results: Contact[];
  progress: number;
  error: string | null;
  metrics: {
    queries?: number;
    pages?: number;
    tokens?: number;
    elapsed_ms?: number;
  };
};
type Delivery = {
  id: string;
  recipient: string;
  status: string;
  created_at: string;
  error: string | null;
};
const labels: Record<string, string> = {
  pending: "En proceso",
  accepted: "Aceptado por el proveedor",
  delivered: "Entrega confirmada",
  failed: "Envío fallido",
  unknown: "Resultado por confirmar",
};
export function Recipients({
  proposal,
  files,
}: {
  proposal: Proposal;
  files: { id: string; name: string }[];
}) {
  const [job, setJob] = useState<Job | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [review, setReview] = useState(false);
  const [subject, setSubject] = useState(
    "Propuesta ciudadana: " + proposal.title,
  );
  const [body, setBody] = useState(
    `Hola,\n\nMe gustaría compartir esta propuesta para Panamá:\n\n${proposal.title}\n\n${proposal.body}\n\nGracias por considerar la propuesta.`,
  );
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [keys, setKeys] = useState<Record<string, string>>({});
  async function history() {
    const { data } = await browserDb()
      .from("deliveries")
      .select("id,recipient,status,created_at,error")
      .eq("proposal_id", proposal.id)
      .order("created_at", { ascending: false });
    setDeliveries(data ?? []);
  }
  useEffect(() => {
    // Restore persisted delivery history, rather than deriving state from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void history();
    browserDb()
      .from("research_jobs")
      .select("*")
      .eq("proposal_id", proposal.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setJob(data);
          setContacts(data.results ?? []);
        }
      });
  }, [proposal.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!job || !["queued", "running"].includes(job.status)) return;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const r = await fetch("/api/research/" + job.id);
        if (!r.ok) return;
        const data = await r.json();
        if (stopped) return;
        setJob(data);
        setContacts(data.results ?? []);
        if (["queued", "running"].includes(data.status))
          await fetch("/api/research/" + job.id, { method: "POST" });
      } catch {
        if (!stopped)
          setMessage(
            "Se perdió la conexión. Los avances permanecen guardados.",
          );
      }
    }, 3500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [job]);
  async function search(depth: "standard" | "deep") {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id, depth }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setJob(data);
      setContacts(data.results ?? []);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No se pudo iniciar la búsqueda.",
      );
    } finally {
      setBusy(false);
    }
  }
  const active = Boolean(job && ["queued", "running"].includes(job.status));
  return (
    <section className="form-card">
      <p className="eyebrow">EL SIGUIENTE PASO LO ELIGES TÚ</p>
      <h2>Hazle llegar tu idea a alguien.</h2>
      <p className="muted">
        Encuentra contactos, revisa su competencia y decide a quién escribir.
      </p>
      <div className="detail-actions">
        <button
          disabled={busy || active}
          className="button primary"
          onClick={() => search("standard")}
        >
          Buscar destinatarios
        </button>
        <button
          disabled={busy || active}
          className="button secondary"
          onClick={() => search("deep")}
        >
          Investigar más
        </button>
        {active && (
          <button
            className="text-button"
            onClick={async () => {
              await fetch("/api/research/" + job!.id, { method: "DELETE" });
              setJob({ ...job!, status: "cancelled" });
            }}
          >
            Cancelar búsqueda
          </button>
        )}
      </div>
      {job && (
        <>
          <div
            className="job-progress"
            aria-label={"Avance de búsqueda: " + job.progress + "%"}
          >
            <span style={{ width: job.progress + "%" }} />
          </div>
          <p className="status-line">
            {active
              ? "Buscando fuentes…"
              : job.status === "cancelled"
                ? "Búsqueda cancelada"
                : job.status === "complete"
                  ? "Búsqueda completada"
                  : "Resultados parciales"}{" "}
            · {job.metrics.queries ?? 0} consultas · {job.metrics.tokens ?? 0}{" "}
            tokens de modelo
          </p>
          <Notice message={job.error ?? ""} />
        </>
      )}
      <Notice message={message} />
      {contacts.map((c) => (
        <div className="comment" key={c.id}>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={selected.includes(c.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, c.id]
                    : selected.filter((x) => x !== c.id),
                )
              }
            />
            <span>
              <b>{c.name}</b>
              <br />
              <small>{c.reason}</small>
            </span>
          </label>
          <p className="status-line">
            {c.email ?? "Canal web"} · {c.source_type} ·{" "}
            {dateLabel(c.checked_at)}
            <br />
            <a
              className="text-button"
              href={c.source_url}
              target="_blank"
              rel="noreferrer"
            >
              Revisar fuente ↗
            </a>
          </p>
        </div>
      ))}
      <details style={{ margin: "20px 0" }}>
        <summary>Añadir un destinatario manualmente</summary>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const email = String(f.get("email") ?? "").trim();
            const url = String(f.get("url") ?? "").trim();
            if (!email && !url) {
              setMessage("Añade un correo profesional o un canal web.");
              return;
            }
            if (url && !url.startsWith("https://")) {
              setMessage("Usa un enlace HTTPS.");
              return;
            }
            const c: Contact = {
              id: crypto.randomUUID(),
              name: String(f.get("name")),
              kind: "Contacto aportado por el autor",
              categories: [proposal.category],
              province: null,
              district: null,
              email: email || null,
              url: url || "",
              source_url: url || "",
              checked_at: new Date().toISOString().slice(0, 10),
              reason:
                "Contacto aportado por el autor. No verificado por la plataforma.",
              source_type: "Manual",
            };
            setContacts([...contacts, c]);
            setSelected([...selected, c.id]);
            form.reset();
          }}
        >
          <label>
            Nombre
            <input name="name" required maxLength={140} />
          </label>
          <label>
            Correo profesional público
            <input name="email" type="email" maxLength={254} />
          </label>
          <label>
            Fuente o portal
            <input name="url" type="url" placeholder="https://" />
          </label>
          <button className="button secondary">Añadir contacto</button>
        </form>
      </details>
      <button
        disabled={!selected.length}
        className="button primary"
        onClick={() => {
          setReview(true);
          setKeys(
            Object.fromEntries(selected.map((id) => [id, crypto.randomUUID()])),
          );
        }}
      >
        Revisar y enviar propuesta
      </button>
      {review && (
        <form
          className="form-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            const f = new FormData(e.currentTarget);
            const errors: string[] = [];
            let sent = 0;
            for (const c of contacts.filter(
              (c) => selected.includes(c.id) && c.email,
            )) {
              try {
                const r = await fetch("/api/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    proposalId: proposal.id,
                    recipient: c.email,
                    subject,
                    body,
                    attachmentIds: selectedFiles,
                    replyToAuthor: f.get("replyTo") === "on",
                    confirmed: true,
                    idempotencyKey: keys[c.id],
                  }),
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.error);
                if (data.status === "accepted" || data.status === "delivered")
                  sent++;
                else
                  errors.push(
                    c.name + ": " + (labels[data.status] ?? data.status),
                  );
              } catch (e) {
                errors.push(
                  c.name +
                    ": " +
                    (e instanceof Error ? e.message : "No se pudo enviar."),
                );
              }
            }
            setMessage(
              `${sent} correos aceptados o entregados. ${errors.join(" ")}`,
            );
            await history();
            setBusy(false);
          }}
        >
          <h3>Revisa el mensaje antes de enviarlo</h3>
          <p className="muted">
            Se enviará por separado a cada correo seleccionado. Los portales se
            tramitan en su propia página.
          </p>
          {contacts
            .filter((c) => selected.includes(c.id))
            .map((c) => (
              <div key={c.id} className="comment">
                <b>{c.name}</b>
                <p>{c.email ?? "Portal externo"}</p>
                {!c.email && (
                  <>
                    <a
                      className="button secondary"
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir portal oficial
                    </a>{" "}
                    <button
                      type="button"
                      className="text-button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          subject +
                            "\n\n" +
                            body +
                            "\n\n" +
                            location.origin +
                            "/propuesta/" +
                            proposal.id,
                        );
                        setMessage(
                          "Texto copiado. Abrir el portal no registra un envío.",
                        );
                      }}
                    >
                      Copiar texto
                    </button>
                  </>
                )}
              </div>
            ))}
          <label>
            Asunto
            <input
              required
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label>
            Mensaje
            <textarea
              required
              minLength={20}
              maxLength={15000}
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <small>Se añadirá el enlace público de la propuesta.</small>
          </label>
          {files.map((f) => (
            <label className="checkbox" key={f.id}>
              <input
                type="checkbox"
                checked={selectedFiles.includes(f.id)}
                onChange={(e) =>
                  setSelectedFiles(
                    e.target.checked
                      ? [...selectedFiles, f.id]
                      : selectedFiles.filter((id) => id !== f.id),
                  )
                }
              />
              <span>Compartir enlace al archivo: {f.name}</span>
            </label>
          ))}
          <label className="checkbox">
            <input type="checkbox" name="replyTo" />
            <span>
              Incluir mi correo como dirección de respuesta para estos
              destinatarios.
            </span>
          </label>
          <label className="checkbox">
            <input type="checkbox" required />
            <span>
              He revisado los destinatarios, el texto y los archivos. Confirmo
              que deseo enviar este mensaje.
            </span>
          </label>
          <button
            className="button primary"
            disabled={
              busy || !contacts.some((c) => selected.includes(c.id) && c.email)
            }
          >
            {busy ? "Enviando…" : "Confirmar envío por correo"}
          </button>
        </form>
      )}
      <h3 className="section-title">Tu historial de envíos</h3>
      {deliveries.length ? (
        deliveries.map((d) => (
          <div key={d.id} className="comment">
            <b>{d.recipient}</b>
            <p>
              {labels[d.status]} · {dateLabel(d.created_at)}
            </p>
            {d.error && <small>{d.error}</small>}
          </div>
        ))
      ) : (
        <p className="muted">
          Todavía no has enviado esta propuesta por correo.
        </p>
      )}
    </section>
  );
}
