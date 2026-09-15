"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Mail, Plus, Send, Trash2 } from "lucide-react";
import { dateLabel, deliveryLabels, type Proposal } from "@/lib/domain";
import { Notice } from "./common";
import { useSession } from "./shell";

type Source = "oficial" | "otra_publica" | "manual";
type Suggestion = {
  id: string; name: string; role_title: string | null; person_name: string | null; level: string; email: string | null;
  contact_url: string | null; phone: string | null; reason: string; jurisdiction: string; source_url: string;
  source_title: string | null; source_kind: Source; checked_at: string; generic_domain: boolean; status: string; notes: string | null;
};
type Saved = {
  id: string; responsable_id: string | null; name: string; role_title: string | null; email: string | null;
  contact_url: string | null; reason: string | null; source_url: string | null; source_kind: Source; checked_at: string | null;
};
type Delivery = { id: string; recipient: string; recipient_name: string | null; status: string; error: string | null; created_at: string; provider: string | null };
type EmailState = { configured: true; sandbox: boolean; provider: string } | { configured: false; reason: string };
type SendResult = { recipientId: string; name: string; status: string; message: string };

function SourceBadge({ kind, generic }: { kind: Source; generic?: boolean }) {
  if (kind === "oficial") return <span className="badge official">Fuente oficial</span>;
  if (kind === "manual") return <span className="badge manual">Añadido por ti · sin verificar</span>;
  return <span className="badge public">Otra fuente pública{generic ? " · dominio genérico" : ""} · por corroborar</span>;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "No se pudo completar la solicitud.");
  return data as T;
}

export function Recipients({ proposal, files, onShared }: { proposal: Proposal; files: { id: string; name: string }[]; onShared: () => Promise<void> }) {
  const { user } = useSession();
  const base = `/api/proposals/${proposal.id}/recipients`;
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [email, setEmail] = useState<EmailState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" | "warn" | "info" } | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [review, setReview] = useState(false);
  const [subject, setSubject] = useState(`Propuesta ciudadana: ${proposal.title}`.slice(0, 200));
  const [body, setBody] = useState(
    `Buenos días:\n\nLes escribo para compartir una propuesta que publiqué y que puede ser de su interés:\n\n«${proposal.title}»\n\n${proposal.body}\n\nQuedo atento a cualquier comentario o a la persona indicada para darle seguimiento.\n\nSaludos cordiales.`.slice(0, 15000),
  );
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [batchKey, setBatchKey] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<{ suggestions: Suggestion[]; saved: Saved[]; deliveries: Delivery[]; email: EmailState }>(base);
      setSuggestions(data.suggestions);
      setSaved(data.saved);
      setDeliveries(data.deliveries);
      setEmail(data.email);
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "No se pudo cargar el directorio.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    // Loads directory suggestions and the author's persisted list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const savedByResponsable = useMemo(() => new Set(saved.map((s) => s.responsable_id).filter(Boolean)), [saved]);
  const emailSelected = saved.filter((s) => selected.has(s.id) && s.email);
  const portalSelected = saved.filter((s) => selected.has(s.id) && !s.email);
  const proposalUrl = typeof location === "undefined" ? "" : `${location.origin}/propuesta/${proposal.id}`;

  async function add(payload: object) {
    setMessage(null);
    try {
      const row = await api<Saved>(base, { method: "POST", body: JSON.stringify(payload) });
      setSaved((s) => [...s, row]);
      setSelected((s) => new Set(s).add(row.id));
      return true;
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "No se pudo añadir.", tone: "error" });
      return false;
    }
  }

  async function remove(id: string) {
    try {
      await api(base + "?recipientId=" + id, { method: "DELETE" });
      setSaved((s) => s.filter((x) => x.id !== id));
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "No se pudo quitar.", tone: "error" });
    }
  }

  function openReview() {
    setReview(true);
    setResults(null);
    setConfirmed(false);
    setBatchKey(crypto.randomUUID());
    setTimeout(() => document.getElementById("revision-envio")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function send() {
    setSending(true);
    setMessage(null);
    try {
      const data = await api<{ results: SendResult[]; sandbox: boolean }>("/api/send", {
        method: "POST",
        body: JSON.stringify({
          proposalId: proposal.id,
          recipientIds: emailSelected.map((s) => s.id),
          subject, message: body, attachmentIds: fileIds, replyToAuthor: replyTo, confirmed: true, batchKey,
        }),
      });
      setResults(data.results);
      const accepted = data.results.filter((r) => r.status === "accepted").length;
      setMessage({
        text: accepted
          ? `${accepted} de ${data.results.length} correos aceptados por el proveedor.${data.sandbox ? " Modo de prueba: se capturaron en el buzón de pruebas, no llegaron a terceros." : " Aceptado no significa leído ni respondido."}`
          : "No se envió ningún correo. Revisa el detalle de cada destinatario.",
        tone: accepted ? "ok" : "error",
      });
      await load();
      await onShared();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "No se pudo enviar.", tone: "error" });
    } finally {
      setSending(false);
    }
  }

  const n = (v: number, one: string, many: string) => `${v.toLocaleString("es-PA")} ${v === 1 ? one : many}`;
  const supportParts = [
    ...(proposal.signatures_enabled || proposal.signature_count > 0 ? [n(proposal.signature_count, "firma", "firmas")] : []),
    n(proposal.like_count, "apoyo", "apoyos"),
    n(proposal.comment_count, "comentario", "comentarios"),
    n(proposal.reshare_count, "republicación", "republicaciones"),
  ];
  const support = `${supportParts.slice(0, -1).join(", ")} y ${supportParts.at(-1)}`;
  const portalText = `${subject}\n\nRespaldo ciudadano: ${support}.\n\n${body}\n\nPropuesta pública: ${proposalUrl}`;

  return (
    <section className="card send-panel" aria-labelledby="enviar-titulo">
      <p className="eyebrow">Solo tú ves esta sección</p>
      <h2 id="enviar-titulo">Envía tu propuesta a quien le puede interesar</h2>
      <p className="muted">
        Te sugerimos responsables según la temática y la ubicación. Tú eliges a quién escribir; la plataforma envía el correo desde su remitente verificado cuando lo confirmas.
      </p>

      {email && !email.configured && <Notice tone="warn" message={`El envío por correo requiere configuración: ${email.reason} Puedes preparar tu lista; no se enviará nada.`} />}
      {email?.configured && email.sandbox && <Notice tone="info" message="Modo de prueba: los correos se entregan a un buzón de pruebas y no llegan a los destinatarios reales." />}
      {message && <Notice message={message.text} tone={message.tone} />}

      <h3 style={{ marginTop: 22 }}>Sugeridos para «{proposal.category}»</h3>
      {loading ? (
        <p className="loading">Buscando responsables…</p>
      ) : suggestions.length ? (
        <div>
          {suggestions.map((s) => {
            const added = savedByResponsable.has(s.id);
            return (
              <div className="recipient" key={s.id}>
                <Mail size={18} color={s.email ? "var(--blue)" : "var(--muted)"} aria-hidden="true" style={{ marginTop: 3 }} />
                <div>
                  <h4>{s.name}</h4>
                  <div className="role">{[s.role_title, s.person_name].filter(Boolean).join(" · ")} <span className="badge level">{s.jurisdiction}</span></div>
                  <p className="reason">{s.reason}</p>
                  {s.email ? <div className="channel">{s.email}</div> : <div className="channel none">Sin correo publicado · canal web: <a href={s.contact_url ?? s.source_url} target="_blank" rel="noreferrer">abrir</a></div>}
                  <div className="source">
                    <SourceBadge kind={s.source_kind} generic={s.generic_domain} />
                    <span>Consultado el {dateLabel(s.checked_at)}</span>
                    <a href={s.source_url} target="_blank" rel="noreferrer">{s.source_title ?? "Ver fuente"}</a>
                  </div>
                </div>
                <button className={"button small " + (added ? "secondary" : "primary")} disabled={added} onClick={() => add({ responsableId: s.id })}>
                  {added ? <><Check size={15} /> En tu lista</> : <><Plus size={15} /> Añadir</>}
                </button>
              </div>
            );
          })}
          <p className="hint">¿No encuentras al responsable adecuado? Añádelo manualmente o consulta el <a className="text-button" href="/responsables" target="_blank">directorio completo</a>.</p>
        </div>
      ) : (
        <Notice tone="warn" message="No hay responsables verificados en el directorio para esta temática y ubicación. Puedes añadir un destinatario manualmente." />
      )}

      <div className="subpanel">
        <h3>Tu lista de destinatarios ({saved.length})</h3>
        {!saved.length && <p className="muted" style={{ margin: 0 }}>Añade responsables sugeridos o un contacto manual.</p>}
        {saved.map((s) => (
          <div className="recipient" key={s.id}>
            <input type="checkbox" aria-label={`Seleccionar ${s.name}`} checked={selected.has(s.id)} onChange={(e) => setSelected((cur) => { const n = new Set(cur); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })} style={{ marginTop: 5, width: 18, height: 18, accentColor: "var(--blue)" }} />
            <div>
              <h4>{s.name}</h4>
              {s.role_title && <div className="role">{s.role_title}</div>}
              {s.email ? <div className="channel">{s.email}</div> : <div className="channel none">Sin correo: se envía por su portal</div>}
              <div className="source"><SourceBadge kind={s.source_kind} />{s.source_url && <a href={s.source_url} target="_blank" rel="noreferrer">Fuente</a>}</div>
            </div>
            <button className="text-button danger" aria-label={`Quitar ${s.name}`} onClick={() => remove(s.id)}><Trash2 size={16} /></button>
          </div>
        ))}
        <button className="text-button" onClick={() => setShowManual(!showManual)} aria-expanded={showManual}>{showManual ? "Cerrar" : "Añadir destinatario manualmente"}</button>
        {showManual && (
          <form
            style={{ marginTop: 12 }}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              const ok = await add({ manual: { name: f.get("name"), role_title: f.get("role_title"), email: f.get("email"), contact_url: f.get("contact_url") } });
              if (ok) { form.reset(); setShowManual(false); }
            }}
          >
            <div className="form-grid">
              <label className="field">Organización o persona<input name="name" required minLength={2} maxLength={160} /></label>
              <label className="field">Cargo o área (opcional)<input name="role_title" maxLength={160} /></label>
              <label className="field">Correo profesional público<input name="email" type="email" maxLength={254} /></label>
              <label className="field">Portal o página de contacto<input name="contact_url" type="url" placeholder="https://" maxLength={500} /></label>
            </div>
            <p className="hint">Indica un correo o un enlace HTTPS. Usa solo contactos profesionales publicados; la plataforma no los verifica.</p>
            <button className="button secondary small">Guardar destinatario</button>
          </form>
        )}
      </div>

      <button className="button accent" disabled={!selected.size} onClick={openReview}><Send size={17} /> Revisar envío ({selected.size})</button>

      {review && selected.size > 0 && (
        <div className="review" id="revision-envio">
          <h3>Revisa antes de enviar</h3>
          {emailSelected.length > 0 && (
            <>
              <p style={{ margin: "6px 0 0", fontWeight: 600 }}>La plataforma enviará un correo individual a:</p>
              <ul className="review-list">
                {emailSelected.map((s) => <li key={s.id}><Mail size={14} /> {s.name} · <b>{s.email}</b> <SourceBadge kind={s.source_kind} /></li>)}
              </ul>
            </>
          )}
          {portalSelected.length > 0 && (
            <div className="subpanel">
              <p style={{ marginTop: 0, fontWeight: 600 }}>Sin correo publicado (se tramitan en su portal; abrirlo no cuenta como envío):</p>
              {portalSelected.map((s) => (
                <div key={s.id} className="toolbar" style={{ marginTop: 6 }}>
                  <span>{s.name}</span>
                  <a className="button secondary small" href={s.contact_url ?? s.source_url ?? "#"} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir portal oficial</a>
                  <button className="button secondary small" onClick={async () => { await navigator.clipboard.writeText(portalText); setMessage({ text: "Texto copiado. Pégalo en el portal oficial.", tone: "ok" }); }}><Copy size={14} /> Copiar texto preparado</button>
                </div>
              ))}
            </div>
          )}
          {emailSelected.length > 0 && (
            <>
              <label className="field">Asunto<input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} /></label>
              <label className="field">Mensaje<textarea value={body} maxLength={15000} rows={10} onChange={(e) => setBody(e.target.value)} /></label>
              <p className="hint" style={{ marginTop: -8 }}>Se añadirá el enlace público: <b style={{ overflowWrap: "anywhere" }}>{proposalUrl}</b>, y una nota que aclara que la plataforma no representa a ninguna entidad.</p>
              <div className="notice info support-note">
                <b>El correo destacará el respaldo ciudadano actual:</b> {support}. Las cifras se toman en el momento del envío.
                {!proposal.signatures_enabled && !proposal.signature_count && <> Si activas la <a href="#firmas">recogida de firmas</a> antes de enviar, también se incluirán.</>}
              </div>
              {files.length > 0 && (
                <fieldset style={{ border: 0, padding: 0, margin: "10px 0" }}>
                  <legend style={{ fontWeight: 600 }}>Fotos y archivos que quieres compartir (se envían como enlace)</legend>
                  {files.map((f) => (
                    <label className="check" key={f.id}>
                      <input type="checkbox" checked={fileIds.includes(f.id)} onChange={(e) => setFileIds(e.target.checked ? [...fileIds, f.id] : fileIds.filter((x) => x !== f.id))} />
                      <span>{f.name}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              <label className="check">
                <input type="checkbox" checked={replyTo} onChange={(e) => setReplyTo(e.target.checked)} />
                <span>Autorizo usar mi correo <b>{user?.email}</b> como dirección de respuesta, para que los destinatarios puedan contestarme directamente. Si no lo marcas, tu correo no se compartirá.</span>
              </label>
              <details style={{ margin: "10px 0" }}>
                <summary className="text-button">Vista previa del texto</summary>
                <div className="preview">{`Para: (cada destinatario por separado)\nAsunto: ${subject}\n\nRespaldo ciudadano: ${support}.\n\n${body}\n\nPropuesta pública: ${proposalUrl}`}</div>
              </details>
              <label className="check">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>He revisado destinatarios, asunto, mensaje y archivos. Confirmo que la plataforma envíe este correo en mi nombre como autor.</span>
              </label>
              <div className="toolbar">
                <button className="button accent" disabled={!confirmed || sending || !email?.configured} onClick={send}>
                  <Send size={17} /> {sending ? "Enviando…" : `Confirmar y enviar ${emailSelected.length} ${emailSelected.length === 1 ? "correo" : "correos"}`}
                </button>
                <button className="button secondary" onClick={() => setReview(false)}>Cancelar</button>
              </div>
              {!email?.configured && <p className="hint">El botón se habilitará cuando el proveedor de correo esté configurado.</p>}
            </>
          )}
          {results && (
            <div style={{ marginTop: 14 }}>
              {results.map((r) => (
                <div className="delivery" key={r.recipientId}><span>{r.name}</span><span className={"st " + r.status}>{deliveryLabels[r.status] ?? r.status}</span><small className="muted" style={{ width: "100%" }}>{r.message}</small></div>
              ))}
            </div>
          )}
        </div>
      )}

      <h3 style={{ marginTop: 26 }}>Historial de envíos</h3>
      <p className="hint" style={{ marginTop: -6 }}>«Aceptado» significa que el proveedor recibió el correo; «Entregado» que el servidor del destinatario lo aceptó. Ninguno indica lectura ni respuesta.</p>
      {deliveries.length ? (
        deliveries.map((d) => (
          <div className="delivery" key={d.id}>
            <span><b>{d.recipient_name ?? d.recipient}</b> · {d.recipient}</span>
            <span className={"st " + d.status}>{deliveryLabels[d.status] ?? d.status}</span>
            <small className="muted" style={{ width: "100%" }}>{dateLabel(d.created_at)}{d.provider?.endsWith(":prueba") ? " · modo de prueba" : ""}{d.error ? " · " + d.error : ""}</small>
          </div>
        ))
      ) : (
        <p className="muted">Todavía no has enviado esta propuesta.</p>
      )}
    </section>
  );
}
