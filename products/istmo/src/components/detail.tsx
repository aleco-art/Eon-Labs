"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Heart, MapPin, MessageCircle, Paperclip, PenLine, Repeat2, Send } from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
import { dateLabel, documentLimit, proposalSelect, type Proposal } from "@/lib/domain";
import { placeLabel, useTerritories } from "@/lib/territories";
import { validateFile } from "@/lib/files";
import { useSession } from "./shell";
import { AuthGate, Notice, ReportButton } from "./common";
import { Avatar, ShareButton, useInteractions, useToggle } from "./feed";
import { Recipients } from "./recipients";
import { Photos } from "./photos";
import { Signatures } from "./signatures";

type Comment = { id: string; author_id: string; body: string; parent_id: string | null; created_at: string; profiles: { name: string; avatar_path: string | null } | null };
type Update = { id: string; body: string; kind: "actualizacion" | "respuesta"; responder: string | null; created_at: string };
type Attachment = { id: string; name: string; owner_id: string; path: string; mime: string; size: number; kind: "foto" | "documento" };

export function Detail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useSession();
  const { territories } = useTerritories();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" | "info" } | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = useCallback(async () => {
    if (!configured) return setLoading(false);
    const db = browserDb();
    const [p, c, u, f] = await Promise.all([
      db.from("proposals").select(proposalSelect).eq("id", id).maybeSingle(),
      db.from("comments").select("id,author_id,body,parent_id,created_at,profiles!comments_author_id_fkey(name,avatar_path)").eq("proposal_id", id).eq("hidden", false).order("created_at"),
      db.from("updates").select("id,body,kind,responder,created_at").eq("proposal_id", id).order("created_at", { ascending: false }),
      db.from("attachments").select("id,name,owner_id,path,mime,size,kind").eq("proposal_id", id).eq("hidden", false).order("created_at"),
    ]);
    setProposal(p.data as unknown as Proposal | null);
    setComments((c.data as unknown as Comment[]) ?? []);
    setUpdates((u.data as Update[]) ?? []);
    setFiles((f.data as Attachment[]) ?? []);
    if ([p, c, u, f].some((r) => r.error)) setMessage({ text: "No se pudo cargar parte de la propuesta.", tone: "error" });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // Loading the proposal and its conversation is synchronisation with the database.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    if (new URLSearchParams(location.search).has("adjuntos"))
      setMessage({ text: "La propuesta se guardó, pero algún archivo no se pudo subir. Puedes añadirlo abajo.", tone: "error" });
  }, [refresh]);

  const [mine, setMine] = useInteractions(proposal ? [proposal.id] : []);
  const toggle = useToggle(setMine, refresh);

  if (loading) return <p className="page loading">Cargando propuesta…</p>;
  if (!proposal)
    return (
      <div className="page narrow">
        <div className="empty">
          <h1>Propuesta no disponible.</h1>
          <p>Puede que se haya eliminado o que esté oculta por moderación.</p>
          <Link className="button primary" href="/">Ver propuestas</Link>
        </div>
      </div>
    );

  const isAuthor = user?.id === proposal.author_id;
  const liked = mine.likes.has(proposal.id);
  const reshared = mine.reshares.has(proposal.id);
  const act = async (kind: "likes" | "reshares", active: boolean) => {
    const err = await toggle(kind, proposal.id, active);
    if (err) setMessage({ text: err, tone: "error" });
  };

  async function saveComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const db = browserDb();
    const result = edit
      ? await db.from("comments").update({ body: commentBody }).eq("id", edit).eq("author_id", user.id)
      : await db.from("comments").insert({ proposal_id: id, author_id: user.id, parent_id: reply, body: commentBody });
    if (result.error) setMessage({ text: result.error.code === "P0001" ? result.error.message : "No se pudo guardar el comentario.", tone: "error" });
    else {
      setCommentBody("");
      setReply(null);
      setEdit(null);
      await refresh();
    }
    setBusy(false);
  }

  const photos = files.filter((f) => f.kind === "foto");
  const documents = files.filter((f) => f.kind !== "foto");
  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (cid: string) => comments.filter((c) => c.parent_id === cid);

  return (
    <div className="page narrow">
      <Link className="back" href="/"><ArrowLeft size={16} /> Volver a propuestas</Link>
      <article className="card detail">
        <div className="meta">
          <span className="tag">{proposal.category}</span>
          <span><MapPin size={14} aria-hidden="true" />{placeLabel(territories, proposal.province, proposal.district, proposal.corregimiento)}</span>
          <span>Publicada el {dateLabel(proposal.created_at)}</span>
        </div>
        <h1>{proposal.title}</h1>
        <div className="author">
          <Avatar name={proposal.profiles?.name} path={proposal.profiles?.avatar_path} />
          <Link href={"/perfil/" + proposal.author_id}>{proposal.profiles?.name ?? "Persona usuaria"}</Link>
          <span className={"status" + (proposal.shared_at ? " shared" : "")}>{proposal.shared_at ? "Compartida con destinatarios" : "Publicada"}</span>
        </div>
        <Photos
          proposalId={proposal.id}
          photos={photos}
          isAuthor={isAuthor}
          userId={user?.id}
          onChange={refresh}
          onMessage={(text, tone) => setMessage({ text, tone })}
        />
        <div className="detail-body">{proposal.body}</div>

        {(documents.length > 0 || isAuthor) && (
          <section aria-label="Archivos de apoyo">
            <h3 style={{ display: "flex", gap: 6, alignItems: "center" }}><Paperclip size={16} /> Archivos de apoyo</h3>
            <div className="files">
              {documents.map((f) => (
                <span className="file" key={f.id}>
                  <FileText size={15} aria-hidden="true" />
                  <a href={"/api/archivo/" + f.id} target="_blank" rel="noreferrer">{f.name}</a>
                  <small className="muted">{Math.max(1, Math.round(f.size / 1024))} KB</small>
                  {isAuthor ? (
                    <button
                      className="text-button danger"
                      onClick={async () => {
                        const db = browserDb();
                        const { error } = await db.from("attachments").delete().eq("id", f.id).eq("owner_id", user!.id);
                        if (!error) await db.storage.from("proposal-files").remove([f.path]);
                        setMessage(error ? { text: "No se pudo quitar el archivo.", tone: "error" } : { text: "Archivo quitado.", tone: "ok" });
                        await refresh();
                      }}
                    >
                      Quitar
                    </button>
                  ) : (
                    <ReportButton target={{ proposalId: proposal.id, attachmentId: f.id }} label="" />
                  )}
                </span>
              ))}
              {!documents.length && <p className="hint">Sin archivos.</p>}
            </div>
            {isAuthor && documents.length < documentLimit && (
              <label className="field" style={{ marginTop: 10 }}>
                Añadir archivo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      await validateFile(file);
                      const form = new FormData();
                      form.set("file", file);
                      form.set("kind", "documento");
                      form.set("proposalId", proposal.id);
                      const r = await fetch("/api/upload", { method: "POST", body: form });
                      const data = await r.json();
                      if (!r.ok) throw new Error(data.error);
                      setMessage({ text: "Archivo añadido. Es visible para cualquier persona.", tone: "ok" });
                      await refresh();
                    } catch (err) {
                      setMessage({ text: err instanceof Error ? err.message : "No se pudo subir el archivo.", tone: "error" });
                    }
                  }}
                />
                <span className="hint">PNG, JPEG, WebP o PDF de hasta 10 MB. Los archivos son públicos.</span>
              </label>
            )}
          </section>
        )}

        <div className="actions" style={{ marginTop: 18 }}>
          <button aria-pressed={liked} aria-label={liked ? "Retirar apoyo" : "Apoyar"} onClick={() => act("likes", liked)}>
            <Heart size={18} /> {proposal.like_count} <span className="label">Apoyos</span>
          </button>
          {(proposal.signatures_enabled || proposal.signature_count > 0) && (
            <a href="#firmas"><PenLine size={18} /> {proposal.signature_count} <span className="label">Firmas</span></a>
          )}
          <a href="#conversacion"><MessageCircle size={18} /> {proposal.comment_count} <span className="label">Comentarios</span></a>
          <button aria-pressed={reshared} aria-label={reshared ? "Quitar republicación" : "Republicar"} onClick={() => act("reshares", reshared)}>
            <Repeat2 size={18} /> {proposal.reshare_count} <span className="label">Republicar</span>
          </button>
          <ShareButton id={proposal.id} title={proposal.title} onMessage={(t) => setMessage({ text: t, tone: "ok" })} />
        </div>
        {/* WhatsApp is where proposals travel in Panama; the link preview carries the share card. */}
        <div className="share-row">
          <a
            className="button secondary small"
            target="_blank"
            rel="noreferrer"
            href={
              "https://wa.me/?text=" +
              encodeURIComponent(
                `«${proposal.title}». ${proposal.signatures_enabled ? "Apóyala y fírmala" : "Apóyala"} en Istmo: ` +
                  new URL("/propuesta/" + proposal.id, process.env.NEXT_PUBLIC_SITE_URL ?? "https://istmoapp.digital").href,
              )
            }
          >
            <Send size={15} /> Compartir por WhatsApp
          </a>
        </div>
        {message && <Notice message={message.text} tone={message.tone} />}

        <div className="toolbar">
          {isAuthor ? (
            <>
              <Link className="button secondary small" href={"/propuesta/" + id + "/editar"}>Editar propuesta</Link>
              <button className="button danger small" onClick={() => setConfirmDelete(!confirmDelete)}>Eliminar</button>
            </>
          ) : (
            <ReportButton target={{ proposalId: proposal.id }} label="Reportar propuesta" />
          )}
        </div>
        {confirmDelete && (
          <div className="notice error">
            <p style={{ margin: "0 0 10px" }}>Se eliminarán la propuesta, sus archivos, comentarios, apoyos y tu lista de destinatarios. No se puede deshacer.</p>
            <button
              className="button accent small"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await fetch("/api/proposals/" + id, { method: "DELETE" });
                if (r.ok) router.push("/");
                else {
                  setMessage({ text: (await r.json()).error, tone: "error" });
                  setBusy(false);
                }
              }}
            >
              Sí, eliminar
            </button>{" "}
            <button className="button secondary small" onClick={() => setConfirmDelete(false)}>Conservar</button>
          </div>
        )}
      </article>

      <Signatures proposal={proposal} isAuthor={isAuthor} onChange={refresh} />

      {isAuthor && <Recipients proposal={proposal} files={files} onShared={refresh} />}

      <h2 className="section-title" id="seguimiento">Seguimiento</h2>
      <p className="muted" style={{ fontSize: "0.92rem" }}>
        Información aportada por el autor de la propuesta. La plataforma no la verifica.{" "}
        <Link href="/respuestas">Ver todas las respuestas de instituciones</Link>
      </p>
      {updates.map((u) => (
        <div className={"update" + (u.kind === "respuesta" ? " response" : "")} key={u.id}>
          <small className="muted">
            {u.kind === "respuesta" ? `Respuesta recibida${u.responder ? " de " + u.responder : ""}, según el autor` : "Actualización del autor"} · {dateLabel(u.created_at)}
          </small>
          <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{u.body}</p>
          {isAuthor && (
            <button className="text-button danger" onClick={async () => { await browserDb().from("updates").delete().eq("id", u.id); await refresh(); }}>Borrar</button>
          )}
        </div>
      ))}
      {!updates.length && <p className="muted">Todavía no hay novedades.</p>}
      {isAuthor && (
        <form
          className="card form-card"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const { error } = await browserDb().from("updates").insert({
              proposal_id: id,
              author_id: user!.id,
              kind: f.get("kind"),
              responder: String(f.get("responder") ?? "").trim() || null,
              body: f.get("body"),
            });
            if (error) setMessage({ text: error.code === "P0001" ? error.message : "No se pudo publicar la novedad.", tone: "error" });
            else {
              form.reset();
              await refresh();
            }
          }}
        >
          <h3>Publicar una novedad</h3>
          <div className="segmented" style={{ marginBottom: 12 }}>
            <label><input type="radio" name="kind" value="actualizacion" defaultChecked /> Actualización</label>
            <label><input type="radio" name="kind" value="respuesta" /> Recibí una respuesta</label>
          </div>
          <label className="field">
            ¿Quién respondió? (opcional)
            <input name="responder" maxLength={160} placeholder="Ej.: Municipio de David" />
          </label>
          <label className="field">
            Novedad
            <textarea name="body" required maxLength={4000} style={{ minHeight: 90 }} />
            <span className="hint">Se publicará como información aportada por ti. No incluyas correos privados ni datos personales de terceros.</span>
          </label>
          <button className="button secondary">Publicar novedad</button>
        </form>
      )}

      <h2 className="section-title" id="conversacion">Conversación ({comments.length})</h2>
      {roots.map((c) => (
        <div key={c.id}>
          <CommentItem c={c} user={user?.id} proposalId={id} onReply={() => { setReply(c.id); setEdit(null); setCommentBody(""); document.getElementById("comment-form")?.scrollIntoView({ behavior: "smooth" }); }} onEdit={() => { setEdit(c.id); setReply(null); setCommentBody(c.body); }} onDeleted={refresh} />
          {repliesOf(c.id).map((r) => (
            <CommentItem key={r.id} c={r} reply parentName={c.profiles?.name} user={user?.id} proposalId={id} onReply={() => { setReply(c.id); setEdit(null); setCommentBody(""); document.getElementById("comment-form")?.scrollIntoView({ behavior: "smooth" }); }} onEdit={() => { setEdit(r.id); setReply(r.parent_id); setCommentBody(r.body); }} onDeleted={refresh} />
          ))}
        </div>
      ))}
      {!comments.length && <p className="muted">Sé la primera persona en comentar.</p>}
      <AuthGate action="comentar">
        <form id="comment-form" className="card form-card" onSubmit={saveComment}>
          <label className="field">
            {edit ? "Editar tu comentario" : reply ? `Responder a ${comments.find((x) => x.id === reply)?.profiles?.name ?? "comentario"}` : "Suma tu opinión"}
            <textarea required maxLength={2000} value={commentBody} onChange={(e) => setCommentBody(e.target.value)} style={{ minHeight: 90 }} />
          </label>
          <div className="toolbar" style={{ marginTop: 0 }}>
            <button className="button primary" disabled={busy}>{edit ? "Guardar cambio" : reply ? "Responder" : "Comentar"}</button>
            {(edit || reply) && <button type="button" className="button secondary" onClick={() => { setEdit(null); setReply(null); setCommentBody(""); }}>Cancelar</button>}
          </div>
        </form>
      </AuthGate>
    </div>
  );
}

function CommentItem({ c, reply, parentName, user, proposalId, onReply, onEdit, onDeleted }: {
  c: Comment; reply?: boolean; parentName?: string; user?: string; proposalId: string;
  onReply: () => void; onEdit: () => void; onDeleted: () => Promise<void>;
}) {
  return (
    <div className={"comment" + (reply ? " reply" : "")}>
      <div className="comment-head">
        <Avatar name={c.profiles?.name} path={c.profiles?.avatar_path} />
        <Link href={"/perfil/" + c.author_id}><b>{c.profiles?.name ?? "Persona usuaria"}</b></Link>
        <span className="muted">{dateLabel(c.created_at)}</span>
        {reply && parentName && <span className="muted">· en respuesta a {parentName}</span>}
      </div>
      <p>{c.body}</p>
      <div className="comment-tools">
        <button className="text-button" onClick={onReply}>Responder</button>
        {c.author_id === user ? (
          <>
            <button className="text-button" onClick={onEdit}>Editar</button>
            <button className="text-button danger" onClick={async () => { await browserDb().from("comments").delete().eq("id", c.id).eq("author_id", user); await onDeleted(); }}>Eliminar</button>
          </>
        ) : (
          <ReportButton target={{ proposalId, commentId: c.id }} />
        )}
      </div>
    </div>
  );
}
