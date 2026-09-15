"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { browserDb } from "@/lib/supabase/client";
import { dateLabel, type Proposal } from "@/lib/domain";
import { useSession } from "./shell";
import { Notice } from "./common";

type Signature = { user_id: string; signer_name: string; public_name: boolean; reason: string | null; created_at: string };

const count = (n: number) => n.toLocaleString("es-PA");

export function SignatureProgress({ proposal, compact = false }: { proposal: Pick<Proposal, "signature_count" | "signature_goal">; compact?: boolean }) {
  const goal = proposal.signature_goal;
  const pct = goal ? Math.min(100, Math.round((proposal.signature_count / goal) * 100)) : null;
  return (
    <div className={"signature-progress" + (compact ? " compact" : "")}>
      <div className="signature-numbers">
        <b>{count(proposal.signature_count)}</b> {proposal.signature_count === 1 ? "firma" : "firmas"}
        {goal ? <span className="muted"> de {count(goal)}</span> : null}
      </div>
      {pct !== null && (
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progreso hacia la meta de firmas">
          <span style={{ width: `${Math.max(pct, proposal.signature_count ? 2 : 0)}%` }} />
        </div>
      )}
    </div>
  );
}

/** Signature collection: one signature per account, public or anonymous, counted by the database. */
export function Signatures({ proposal, isAuthor, onChange }: { proposal: Proposal; isAuthor: boolean; onChange: () => Promise<void> }) {
  const { user } = useSession();
  const [recent, setRecent] = useState<Signature[]>([]);
  const [mine, setMine] = useState<Signature | null>(null);
  const [name, setName] = useState("");
  const [publicName, setPublicName] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const load = useCallback(async () => {
    const db = browserDb();
    const [r, m, p] = await Promise.all([
      db.from("signatures").select("user_id,signer_name,public_name,reason,created_at").eq("proposal_id", proposal.id).eq("public_name", true).order("created_at", { ascending: false }).limit(12),
      user ? db.from("signatures").select("user_id,signer_name,public_name,reason,created_at").eq("proposal_id", proposal.id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      user ? db.from("profiles").select("name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setRecent((r.data as Signature[]) ?? []);
    setMine((m.data as Signature | null) ?? null);
    setName((current) => current || (p.data as { name: string } | null)?.name || "");
  }, [proposal.id, user]);

  useEffect(() => {
    // Signatures are read from the database.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setEnabled(enabled: boolean) {
    setBusy(true);
    const { error } = await browserDb().from("proposals").update({ signatures_enabled: enabled }).eq("id", proposal.id).eq("author_id", user!.id);
    setMessage(error ? { text: "No se pudo cambiar la recogida de firmas.", tone: "error" } : null);
    await onChange();
    setBusy(false);
  }

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setMessage(null);
    const { error } = await browserDb().from("signatures").insert({
      proposal_id: proposal.id,
      user_id: user.id,
      signer_name: name.trim(),
      public_name: publicName,
      reason: reason.trim() || null,
    });
    if (error)
      setMessage({
        text: error.code === "23505" ? "Ya firmaste esta propuesta." : error.code === "P0001" ? error.message : "No se pudo registrar tu firma. Inténtalo de nuevo.",
        tone: "error",
      });
    else {
      setReason("");
      setMessage({ text: "¡Gracias! Tu firma quedó registrada.", tone: "ok" });
    }
    await Promise.all([load(), onChange()]);
    setBusy(false);
  }

  async function withdraw() {
    setBusy(true);
    const { error } = await browserDb().from("signatures").delete().eq("proposal_id", proposal.id).eq("user_id", user!.id);
    setMessage(error ? { text: "No se pudo retirar tu firma.", tone: "error" } : { text: "Retiraste tu firma.", tone: "ok" });
    await Promise.all([load(), onChange()]);
    setBusy(false);
  }

  if (!proposal.signatures_enabled && !proposal.signature_count) {
    if (!isAuthor) return null;
    return (
      <section className="card signatures off" id="firmas">
        <div>
          <h3><PenLine size={18} aria-hidden="true" /> Recoger firmas</h3>
          <p className="muted">Activa las firmas para que la comunidad respalde tu propuesta. El total se incluye en los correos a los responsables.</p>
        </div>
        <button className="button primary small" disabled={busy} onClick={() => setEnabled(true)}>Activar firmas</button>
        {message && <Notice message={message.text} tone={message.tone} />}
      </section>
    );
  }

  return (
    <section className="card signatures" id="firmas" aria-labelledby="firmas-titulo">
      <p className="eyebrow">Recogida de firmas</p>
      <h2 id="firmas-titulo">{proposal.signatures_enabled ? "Firma para respaldar esta propuesta" : "Firmas recogidas"}</h2>
      <SignatureProgress proposal={proposal} />
      {!proposal.signatures_enabled && <Notice tone="warn" message="La persona autora pausó la recogida de firmas. Las firmas recogidas se conservan." />}

      {proposal.signatures_enabled && !user && (
        <div className="toolbar">
          <Link className="button accent" href="/cuenta">Entra para firmar</Link>
          <span className="muted">Cada persona firma una sola vez con su cuenta.</span>
        </div>
      )}
      {user && mine && (
        <div className="notice ok signed">
          <span>Firmaste el {dateLabel(mine.created_at)} como <b>{mine.public_name ? mine.signer_name : "firma anónima"}</b>.</span>
          <button className="text-button" disabled={busy} onClick={withdraw}>Retirar mi firma</button>
        </div>
      )}
      {proposal.signatures_enabled && user && !mine && (
        <form className="sign-form" onSubmit={sign}>
          <div className="form-grid">
            <label className="field">Nombre con el que firmas<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
            <label className="field">¿Por qué firmas? (opcional)<input maxLength={280} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: Lo uso todos los días" /></label>
          </div>
          <label className="check">
            <input type="checkbox" checked={publicName} onChange={(e) => setPublicName(e.target.checked)} />
            <span>Mostrar mi nombre en la lista de firmantes. Si no lo marcas, tu firma cuenta igual pero aparece como anónima.</span>
          </label>
          <button className="button accent" disabled={busy}><PenLine size={17} /> {busy ? "Firmando…" : "Firmar la propuesta"}</button>
        </form>
      )}
      {message && <Notice message={message.text} tone={message.tone} />}

      {recent.length > 0 && (
        <>
          <h3 style={{ marginTop: 18 }}>Últimas firmas públicas</h3>
          <ul className="signers">
            {recent.map((s) => (
              <li key={s.user_id}>
                <Link href={"/perfil/" + s.user_id}><b>{s.signer_name}</b></Link>
                <span className="muted"> · {dateLabel(s.created_at)}</span>
                {s.reason && <p>«{s.reason}»</p>}
              </li>
            ))}
          </ul>
        </>
      )}
      {isAuthor && (
        <div className="toolbar">
          <button className="button secondary small" disabled={busy} onClick={() => setEnabled(!proposal.signatures_enabled)}>
            {proposal.signatures_enabled ? "Pausar la recogida de firmas" : "Reanudar la recogida de firmas"}
          </button>
          <Link className="text-button" href={"/propuesta/" + proposal.id + "/editar"}>Cambiar la meta</Link>
        </div>
      )}
    </section>
  );
}
