"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, configured } from "@/lib/supabase/client";
import { dateLabel, type Proposal } from "@/lib/domain";
import { proposalSelect, ProposalCard } from "./feed";
import { useSession } from "./shell";
import { Notice, Report, AuthGate } from "./common";
import { Recipients } from "./recipients";
import { useRouter } from "next/navigation";
type Comment = {
  id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  profiles: { name: string };
};
type Update = { id: string; body: string; created_at: string };
type Attachment = { id: string; name: string; owner_id: string; path: string };
export function Detail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useSession();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function refresh() {
    if (!configured) {
      setLoading(false);
      return;
    }
    const db = browserDb();
    const results = await Promise.all([
      db.from("proposals").select(proposalSelect).eq("id", id).single(),
      db
        .from("comments")
        .select("*,profiles!comments_author_id_fkey(name)")
        .eq("proposal_id", id)
        .eq("hidden", false)
        .order("created_at"),
      db
        .from("updates")
        .select("*")
        .eq("proposal_id", id)
        .order("created_at", { ascending: false }),
      db.from("attachments").select("*").eq("proposal_id", id),
    ]);
    setProposal(results[0].data as unknown as Proposal);
    setComments((results[1].data as unknown as Comment[]) ?? []);
    setUpdates(results[2].data ?? []);
    setFiles(results[3].data ?? []);
    if (results.some((r) => r.error))
      setMessage("No se pudo cargar parte de la propuesta.");
    setLoading(false);
  }
  useEffect(() => {
    // Fetching persisted data is an external synchronization, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    if (new URLSearchParams(location.search).has("adjuntos"))
      setMessage(
        "La propuesta se guardó, pero algún adjunto falló. Puedes volver a añadirlo desde Editar.",
      );
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = user?.id === proposal?.author_id;
  if (loading) return <p>Cargando propuesta…</p>;
  if (!proposal)
    return (
      <div className="empty-state">
        <h1>Propuesta no disponible.</h1>
        <Link href="/">Volver a explorar</Link>
      </div>
    );
  return (
    <div className="narrow-page">
      <Link className="small-link" href="/">
        ← Explorar ideas
      </Link>
      <ProposalCard proposal={proposal} onChange={refresh} />
      <div className="document">
        <h1>{proposal.title}</h1>
        <div className="detail-body">{proposal.body}</div>
        <div className="attachment-list">
          {files.map((f) => (
            <div key={f.id}>
              <a href={"/api/archivo/" + f.id} target="_blank" rel="noreferrer">
                ↓ {f.name}
              </a>
              {mine && (
                <button
                  className="text-button danger"
                  onClick={async () => {
                    const db = browserDb();
                    const { error } = await db.storage
                      .from("proposal-files")
                      .remove([f.path]);
                    if (!error)
                      await db.from("attachments").delete().eq("id", f.id);
                    else setMessage("No se pudo eliminar el archivo.");
                    await refresh();
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
        {mine && (
          <div className="detail-actions">
            <Link
              className="button secondary"
              href={"/propuesta/" + id + "/editar"}
            >
              Editar propuesta
            </Link>
            <button
              className="text-button danger"
              onClick={() => setConfirmDelete(!confirmDelete)}
            >
              Eliminar propuesta
            </button>
          </div>
        )}
        {confirmDelete && (
          <div className="notice">
            <p>
              Se eliminarán la propuesta, sus comentarios e interacciones. Esta
              acción no se puede deshacer.
            </p>
            <button
              className="button secondary danger"
              onClick={async () => {
                setBusy(true);
                const response = await fetch("/api/proposals/" + id, {
                  method: "DELETE",
                });
                    if (response.ok) router.push("/");
                else {
                  const data = await response.json();
                  setMessage(data.error);
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Sí, eliminar
            </button>{" "}
            <button onClick={() => setConfirmDelete(false)}>Conservar</button>
          </div>
        )}
        <Report proposalId={id} />
        <Notice message={message} />
      </div>
      {mine && <Recipients proposal={proposal} files={files} />}
      <h2 className="section-title">Actualizaciones del autor</h2>
      <p className="muted">
        La información de esta sección la aporta quien publicó la propuesta.
      </p>
      {updates.map((u) => (
        <div className="comment" key={u.id}>
          <small>{dateLabel(u.created_at)} · Reportado por el autor</small>
          <p>{u.body}</p>
        </div>
      ))}
      {!updates.length && (
        <p className="muted">Todavía no hay actualizaciones.</p>
      )}
      {mine && (
        <form
          className="form-card"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const body = String(new FormData(form).get("body"));
            const { error } = await browserDb()
              .from("updates")
              .insert({ proposal_id: id, author_id: user!.id, body });
            if (error) setMessage("No se pudo publicar la actualización.");
            else {
              form.reset();
              await refresh();
            }
          }}
        >
          <label>
            Comparte una novedad o una respuesta recibida
            <textarea name="body" required minLength={1} maxLength={4000} />
            <small>
              No publiques correos privados o datos personales de terceros.
            </small>
          </label>
          <button className="button secondary">Publicar actualización</button>
        </form>
      )}
      <h2 className="section-title" id="conversacion">
        La conversación <span className="muted">({comments.length})</span>
      </h2>
      {comments.map((c) => (
        <div className={"comment " + (c.parent_id ? "reply" : "")} key={c.id}>
          <div className="comment-meta">
            <Link href={"/perfil/" + c.author_id}>
              <b>{c.profiles?.name ?? "Ciudadano"}</b>
            </Link>
            <span className="muted">{dateLabel(c.created_at)}</span>
          </div>
          {c.parent_id && (
            <small className="muted">
              En respuesta a{" "}
              {comments.find((x) => x.id === c.parent_id)?.profiles?.name ??
                "un comentario"}
            </small>
          )}
          <p>{c.body}</p>
          <div className="comment-actions">
            <button
              className="text-button"
              onClick={() => {
                setReply(c.id);
                setEdit(null);
                setCommentBody("");
                document
                  .getElementById("comment-form")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Responder
            </button>
            {c.author_id === user?.id && (
              <>
                <button
                  className="text-button"
                  onClick={() => {
                    setEdit(c.id);
                    setReply(c.parent_id);
                    setCommentBody(c.body);
                  }}
                >
                  Editar
                </button>
                <button
                  className="text-button danger"
                  onClick={async () => {
                    const { error } = await browserDb()
                      .from("comments")
                      .delete()
                      .eq("id", c.id)
                      .eq("author_id", user.id);
                    if (error) setMessage("No se pudo borrar el comentario.");
                    else await refresh();
                  }}
                >
                  Eliminar
                </button>
              </>
            )}
            <Report proposalId={id} commentId={c.id} />
          </div>
        </div>
      ))}
      <AuthGate>
        <form
          id="comment-form"
          className="form-card"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return;
            setBusy(true);
            const db = browserDb();
            const result = edit
              ? await db
                  .from("comments")
                  .update({ body: commentBody })
                  .eq("id", edit)
                  .eq("author_id", user.id)
              : await db
                  .from("comments")
                  .insert({
                    proposal_id: id,
                    author_id: user.id,
                    parent_id: reply,
                    body: commentBody,
                  });
            if (result.error) setMessage("No se pudo guardar el comentario.");
            else {
              setCommentBody("");
              setReply(null);
              setEdit(null);
              await refresh();
            }
            setBusy(false);
          }}
        >
          <label>
            {edit
              ? "Editar comentario"
              : reply
                ? "Tu respuesta"
                : "Suma tu perspectiva"}
            <textarea
              required
              minLength={1}
              maxLength={2000}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
          </label>
          <button disabled={busy} className="button primary">
            {edit ? "Guardar cambio" : "Comentar"}
          </button>
          {(edit || reply) && (
            <button
              type="button"
              onClick={() => {
                setEdit(null);
                setReply(null);
                setCommentBody("");
              }}
            >
              Cancelar
            </button>
          )}
        </form>
      </AuthGate>
    </div>
  );
}
