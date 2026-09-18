import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";
import { dateLabel, photoUrl } from "@/lib/domain";
import { excerpt } from "@/lib/share";
import { placeName } from "@/lib/place";
import { publicDb } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Respuestas",
  description:
    "Las respuestas que entidades y responsables de Panamá han dado a propuestas ciudadanas en Istmo, con la propuesta, sus firmas y lo que pasó después.",
};

// A public showcase: an answer the author just published shows up within a minute.
export const revalidate = 60;

type Row = {
  id: string;
  body: string;
  responder: string | null;
  created_at: string;
  proposals: {
    id: string;
    title: string;
    category: string;
    province: string | null;
    district: string | null;
    corregimiento: string | null;
    signature_count: number;
    signatures_enabled: boolean;
    like_count: number;
    profiles: { name: string } | null;
  };
};

async function load() {
  const db = publicDb();
  if (!db) return [];
  const { data } = await db
    .from("updates")
    .select(
      "id,body,responder,created_at,proposals!inner(id,title,category,province,district,corregimiento,signature_count,signatures_enabled,like_count,hidden,profiles!proposals_author_id_fkey(name))",
    )
    .eq("kind", "respuesta")
    .eq("proposals.hidden", false)
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) return [];

  const ids = [...new Set(rows.map((r) => r.proposals.id))];
  const { data: photos } = await db
    .from("attachments")
    .select("id,proposal_id,mime")
    .in("proposal_id", ids)
    .eq("kind", "foto")
    .eq("hidden", false)
    .order("created_at");
  const cover = new Map<string, string>();
  for (const p of photos ?? []) if (!cover.has(p.proposal_id)) cover.set(p.proposal_id, p.id);

  const places = new Map<string, string>();
  await Promise.all(ids.map(async (id) => places.set(id, await placeName(db, rows.find((r) => r.proposals.id === id)!.proposals))));

  return rows.map((r) => ({ ...r, place: places.get(r.proposals.id) ?? "Panamá", cover: cover.get(r.proposals.id) ?? null }));
}

export default async function Answers() {
  const answers = await load();
  const entities = new Set(answers.map((a) => (a.responder ?? "").trim().toLowerCase()).filter(Boolean));

  return (
    <div className="page">
      <p className="eyebrow">Respuestas</p>
      <h1>Cuando las instituciones responden</h1>
      <p className="lede">
        Aquí se reúnen las respuestas que los autores dicen haber recibido de entidades y responsables. Istmo no las
        verifica: cada una enlaza a su propuesta pública, con el texto completo y lo que pasó después.
      </p>

      {answers.length === 0 ? (
        <div className="card answers-empty">
          <MessageSquareQuote size={30} aria-hidden="true" />
          <h2>Todavía no hay respuestas publicadas</h2>
          <p>
            Cuando una entidad conteste a una propuesta, el autor puede publicarlo en su propuesta y aparecerá aquí, para
            que todo el mundo vea qué instituciones escuchan.
          </p>
          <p className="muted">
            ¿Te respondieron? Entra en tu propuesta y, en <b>Seguimiento</b>, elige <b>«Recibí una respuesta»</b>.
          </p>
          <div className="toolbar" style={{ justifyContent: "center" }}>
            <Link className="button accent" href="/crear">Hacer una propuesta</Link>
            <Link className="button secondary" href="/responsables">Ver a quién escribir</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="answers-count">
            <b>{answers.length.toLocaleString("es-PA")}</b> {answers.length === 1 ? "respuesta" : "respuestas"} de{" "}
            <b>{entities.size.toLocaleString("es-PA")}</b> {entities.size === 1 ? "entidad" : "entidades"}
          </p>
          <div className="answers">
            {answers.map((a) => {
              const p = a.proposals;
              const url = "/propuesta/" + p.id;
              return (
                <article className="card answer-card" key={a.id}>
                  {a.cover && (
                    <Link href={url} className="answer-cover" tabIndex={-1} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element -- served through our own signed-URL redirect */}
                      <img src={photoUrl(a.cover)} alt="" loading="lazy" />
                    </Link>
                  )}
                  <div className="answer-main">
                    <p className="answer-who">{a.responder ? `Respuesta de ${a.responder}` : "Respuesta recibida"}</p>
                    <h2>
                      <Link href={url}>{p.title}</Link>
                    </h2>
                    <p className="meta">
                      {p.category} · {a.place}
                      {p.profiles?.name ? ` · por ${p.profiles.name}` : ""}
                    </p>
                    <blockquote className="answer-quote">{excerpt(a.body, 320)}</blockquote>
                    <p className="answer-foot">
                      <span>{dateLabel(a.created_at)}</span>
                      {(p.signatures_enabled || p.signature_count > 0) && (
                        <span>
                          {p.signature_count.toLocaleString("es-PA")} {p.signature_count === 1 ? "firma" : "firmas"}
                        </span>
                      )}
                      {p.like_count > 0 && (
                        <span>
                          {p.like_count.toLocaleString("es-PA")} {p.like_count === 1 ? "apoyo" : "apoyos"}
                        </span>
                      )}
                      <Link href={url + "#seguimiento"}>Ver la propuesta y su seguimiento →</Link>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
