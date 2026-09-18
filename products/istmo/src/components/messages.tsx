"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Flag, MessageSquare, Send, ShieldOff } from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
import { messageLimit, timeLabel, type Conversation, type Message } from "@/lib/domain";
import { Notice } from "./common";
import { useSession } from "./shell";
import { Avatar } from "./feed";

const problem = (e: unknown) => (e instanceof Error ? e.message : "No se pudo completar la acción.");

/** Everyone you have written to or who has written to you, newest first. */
export function Inbox() {
  const { user, ready } = useSession();
  const [rows, setRows] = useState<Conversation[] | null>(null);

  const load = useCallback(async () => {
    if (!configured || !user) return;
    const { data } = await browserDb().rpc("my_conversations");
    setRows((data as Conversation[]) ?? []);
  }, [user]);

  useEffect(() => {
    // The inbox is read with the reader's own permissions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (!ready) return <p className="page loading">Cargando…</p>;
  if (!user)
    return (
      <div className="page narrow">
        <div className="empty">
          <h1>Mensajes</h1>
          <p>
            <Link href="/cuenta">Inicia sesión</Link> para ver tus mensajes.
          </p>
        </div>
      </div>
    );

  return (
    <div className="page narrow">
      <p className="eyebrow">Mensajes</p>
      <h1>Tus conversaciones</h1>
      <p className="muted">
        Escribe a otras personas de Istmo sobre sus propuestas. Nadie ve el correo de nadie, y puedes bloquear o
        reportar a quien te moleste.
      </p>
      {rows === null ? (
        <p className="loading">Cargando conversaciones…</p>
      ) : rows.length === 0 ? (
        <div className="empty">
          <p>Todavía no tienes conversaciones. Abre el perfil de alguien y pulsa «Enviar mensaje».</p>
        </div>
      ) : (
        <ul className="thread-list">
          {rows.map((c) => (
            <li key={c.conversation_id} data-unread={c.unread > 0 ? true : undefined}>
              <Link href={"/mensajes/" + c.conversation_id}>
                <Avatar name={c.other_name} path={c.other_avatar} />
                <span className="thread-text">
                  <span className="thread-top">
                    <b>{c.other_name}</b>
                    {c.last_at && <span className="thread-when">{timeLabel(c.last_at)}</span>}
                  </span>
                  <span className="thread-last">
                    {c.last_mine ? "Tú: " : ""}
                    {c.last_body ?? "Sin mensajes"}
                  </span>
                </span>
                {c.unread > 0 && <span className="thread-badge">{c.unread}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One conversation: the messages, the composer, and the tools to defend yourself. */
export function Thread({ id }: { id: string }) {
  const { user, ready } = useSession();
  const [other, setOther] = useState<{ id: string; name: string; avatar_path: string | null } | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" | "info" } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!configured || !user) return;
    const db = browserDb();
    const { data: convo } = await db.from("conversations").select("id,user_a,user_b").eq("id", id).maybeSingle();
    if (!convo) {
      setOther(null);
      return;
    }
    const otherId = convo.user_a === user.id ? convo.user_b : convo.user_a;
    const [{ data: profile }, { data: rows }, { data: block }] = await Promise.all([
      db.from("profiles").select("id,name,avatar_path").eq("id", otherId).maybeSingle(),
      db.from("messages").select("id,sender_id,body,created_at,read_at,hidden").eq("conversation_id", id).order("created_at"),
      db.from("blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", otherId).maybeSingle(),
    ]);
    setOther(profile ?? null);
    setMessages((rows as Message[]) ?? []);
    setBlocked(Boolean(block));
    // Reading the thread is what marks it as read.
    await db.from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", id).is("read_at", null);
  }, [id, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (!ready) return <p className="page loading">Cargando…</p>;
  if (!user)
    return (
      <div className="page narrow">
        <div className="empty">
          <h1>Mensajes</h1>
          <p>
            <Link href="/cuenta">Inicia sesión</Link> para ver esta conversación.
          </p>
        </div>
      </div>
    );
  if (other === undefined) return <p className="page loading">Cargando conversación…</p>;
  if (other === null)
    return (
      <div className="page narrow">
        <div className="empty">
          <h1>Conversación no disponible.</h1>
          <p>
            <Link href="/mensajes">Volver a tus mensajes</Link>
          </p>
        </div>
      </div>
    );

  async function send() {
    if (!other || !body.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const { error } = await browserDb().rpc("send_message", { p_to: other.id, p_body: body });
      if (error) throw new Error(error.message);
      setBody("");
      await load();
    } catch (e) {
      setMessage({ text: problem(e), tone: "error" });
    } finally {
      setSending(false);
    }
  }

  async function toggleBlock() {
    if (!other || !user) return;
    const db = browserDb();
    const { error } = blocked
      ? await db.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", other.id)
      : await db.from("blocks").insert({ blocker_id: user.id, blocked_id: other.id });
    if (error) {
      setMessage({ text: "No se pudo cambiar el bloqueo.", tone: "error" });
      return;
    }
    setBlocked(!blocked);
    setMessage({
      text: blocked ? "Ya puede volver a escribirte." : "Bloqueada. No podrán escribirse hasta que lo deshagas.",
      tone: "ok",
    });
  }

  async function report(messageId: string) {
    const reason = window.prompt("¿Qué pasa con este mensaje? Cuéntaselo a los moderadores.");
    if (!reason) return;
    const { error } = await browserDb().rpc("report_message", { p_message: messageId, p_reason: reason });
    setMessage(
      error
        ? { text: error.message, tone: "error" }
        : { text: "Reporte enviado. Un moderador lo revisará.", tone: "ok" },
    );
  }

  return (
    <div className="page narrow">
      <Link className="text-button" href="/mensajes">
        ← Todos tus mensajes
      </Link>
      <div className="chat-head">
        <Avatar name={other.name} path={other.avatar_path} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "1.3rem" }}>{other.name}</h1>
          <Link className="muted" href={"/perfil/" + other.id}>
            Ver su perfil
          </Link>
        </div>
        <button className="button secondary small" onClick={toggleBlock} style={{ marginLeft: "auto" }}>
          {blocked ? <ShieldOff size={15} /> : <Ban size={15} />} {blocked ? "Desbloquear" : "Bloquear"}
        </button>
      </div>
      {message && <Notice message={message.text} tone={message.tone} />}
      {blocked && (
        <Notice
          tone="warn"
          message="Tienes bloqueada a esta persona. Ninguno de los dos puede escribir mientras el bloqueo esté activo."
        />
      )}
      <div className="chat">
        {messages.length === 0 && <p className="muted">Aquí aparecerán los mensajes.</p>}
        {messages.map((m) => (
          <div key={m.id} className="bubble" data-mine={m.sender_id === user.id ? true : undefined}>
            <p className="bubble-body">{m.hidden ? "Mensaje retirado por moderación." : m.body}</p>
            <span className="bubble-foot">
              {timeLabel(m.created_at)}
              {m.sender_id !== user.id && !m.hidden && (
                <button className="text-button" onClick={() => report(m.id)} title="Reportar este mensaje">
                  <Flag size={13} /> Reportar
                </button>
              )}
            </span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="composer">
        <textarea
          value={body}
          maxLength={messageLimit}
          rows={3}
          placeholder={blocked ? "Desbloquea para escribir" : "Escribe tu mensaje"}
          disabled={blocked || sending}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="button accent" onClick={send} disabled={blocked || sending || !body.trim()}>
          <Send size={16} /> {sending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}

/** «Enviar mensaje» on someone else's profile: writes the first line and opens the thread. */
export function MessageButton({ userId, name }: { userId: string; name: string }) {
  const { user } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.id === userId) return null;

  async function send() {
    setSending(true);
    setError(null);
    try {
      const { data, error: failed } = await browserDb().rpc("send_message", { p_to: userId, p_body: body });
      if (failed) throw new Error(failed.message);
      router.push("/mensajes/" + data);
    } catch (e) {
      setError(problem(e));
      setSending(false);
    }
  }

  if (!open)
    return (
      <button className="button secondary small" onClick={() => setOpen(true)}>
        <MessageSquare size={15} /> Enviar mensaje
      </button>
    );

  return (
    <div className="quick-message">
      <label className="field">
        Mensaje para {name}
        <textarea
          value={body}
          maxLength={messageLimit}
          rows={4}
          autoFocus
          placeholder="Preséntate y di de qué quieres hablar."
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      {error && <Notice tone="error" message={error} />}
      <div className="toolbar">
        <button className="button accent small" onClick={send} disabled={sending || !body.trim()}>
          <Send size={15} /> {sending ? "Enviando…" : "Enviar"}
        </button>
        <button className="button secondary small" onClick={() => setOpen(false)} disabled={sending}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
