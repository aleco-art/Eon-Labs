"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MapPin, MessageCircle, Repeat2, Search, Share2 } from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
import { categories, dateLabel, normalize, photoUrl, proposalSelect, type Proposal } from "@/lib/domain";
import { SignatureProgress } from "./signatures";
import { placeLabel, useTerritories } from "@/lib/territories";
import { useSession } from "./shell";
import { emptyTerritory, Notice, TerritorySelect, type TerritoryValue } from "./common";

type Mine = { likes: Set<string>; reshares: Set<string> };

export function Avatar({ name, path }: { name?: string | null; path?: string | null }) {
  const url = path && configured ? browserDb().storage.from("avatars").getPublicUrl(path).data.publicUrl : null;
  return (
    <span className="avatar" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" /> : (name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

export function useInteractions(ids: string[]) {
  const { user } = useSession();
  const [mine, setMine] = useState<Mine>({ likes: new Set(), reshares: new Set() });
  const key = ids.join(",");
  useEffect(() => {
    if (!user || !ids.length) return;
    const db = browserDb();
    Promise.all([
      db.from("likes").select("proposal_id").eq("user_id", user.id).in("proposal_id", ids),
      db.from("reshares").select("proposal_id").eq("user_id", user.id).in("proposal_id", ids),
    ]).then(([l, r]) =>
      setMine({
        likes: new Set((l.data ?? []).map((x) => x.proposal_id)),
        reshares: new Set((r.data ?? []).map((x) => x.proposal_id)),
      }),
    );
  }, [user, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return [user ? mine : { likes: new Set<string>(), reshares: new Set<string>() }, setMine] as const;
}

/** First photo of each proposal, used as the card cover. */
export function useCovers(ids: string[]) {
  const [covers, setCovers] = useState<Map<string, string>>(new Map());
  const key = ids.join(",");
  useEffect(() => {
    if (!configured || !ids.length) return;
    browserDb()
      .from("attachments")
      .select("id,proposal_id")
      .in("proposal_id", ids)
      .eq("kind", "foto")
      .eq("hidden", false)
      .order("created_at")
      .then(({ data }) => {
        const map = new Map<string, string>();
        for (const row of data ?? []) if (!map.has(row.proposal_id)) map.set(row.proposal_id, row.id);
        setCovers(map);
      });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return covers;
}

export function ProposalCard({
  proposal,
  mine,
  onToggle,
  compact = false,
  cover,
}: {
  proposal: Proposal;
  mine: Mine;
  onToggle: (kind: "likes" | "reshares", id: string, active: boolean) => Promise<string | null>;
  compact?: boolean;
  cover?: string;
}) {
  const { territories } = useTerritories();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const liked = mine.likes.has(proposal.id);
  const reshared = mine.reshares.has(proposal.id);
  async function toggle(kind: "likes" | "reshares", active: boolean) {
    setBusy(true);
    setMessage((await onToggle(kind, proposal.id, active)) ?? "");
    setBusy(false);
  }
  return (
    <article className={"card proposal-card" + (cover ? " has-cover" : "")}>
      {cover && (
        <Link className="card-cover" href={"/propuesta/" + proposal.id} tabIndex={-1} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(cover)} alt="" loading="lazy" />
        </Link>
      )}
      <div className="meta">
        <span className="tag">{proposal.category}</span>
        <span><MapPin size={14} aria-hidden="true" />{placeLabel(territories, proposal.province, proposal.district, proposal.corregimiento)}</span>
        <span>{dateLabel(proposal.created_at)}</span>
      </div>
      <h3><Link href={"/propuesta/" + proposal.id}>{proposal.title}</Link></h3>
      {!compact && <p className="excerpt">{proposal.body}</p>}
      {(proposal.signatures_enabled || proposal.signature_count > 0) && <SignatureProgress proposal={proposal} compact />}
      <div className="author">
        <Avatar name={proposal.profiles?.name} path={proposal.profiles?.avatar_path} />
        <Link href={"/perfil/" + proposal.author_id}>{proposal.profiles?.name ?? "Persona usuaria"}</Link>
        <span className={"status" + (proposal.shared_at ? " shared" : "")}>
          {proposal.shared_at ? "Compartida con destinatarios" : "Publicada"}
        </span>
      </div>
      <div className="actions">
        <button disabled={busy} aria-pressed={liked} aria-label={liked ? "Retirar apoyo" : "Apoyar"} onClick={() => toggle("likes", liked)}>
          <Heart size={17} /> {proposal.like_count} <span className="label">Apoyos</span>
        </button>
        <Link href={"/propuesta/" + proposal.id + "#conversacion"} aria-label="Comentarios">
          <MessageCircle size={17} /> {proposal.comment_count} <span className="label">Comentarios</span>
        </Link>
        <button disabled={busy} aria-pressed={reshared} aria-label={reshared ? "Quitar republicación" : "Republicar"} onClick={() => toggle("reshares", reshared)}>
          <Repeat2 size={17} /> {proposal.reshare_count}
        </button>
        <ShareButton id={proposal.id} title={proposal.title} onMessage={setMessage} />
      </div>
      <Notice message={message} />
    </article>
  );
}

export function ShareButton({ id, title, onMessage }: { id: string; title: string; onMessage: (m: string) => void }) {
  return (
    <button
      className="push"
      aria-label="Compartir enlace"
      onClick={async () => {
        const url = location.origin + "/propuesta/" + id;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            onMessage("Enlace copiado.");
          }
        } catch {
          /* The user closed the share sheet. */
        }
      }}
    >
      <Share2 size={17} />
    </button>
  );
}

/** Persists a like or reshare and returns an error message, if any. Counters come from the database. */
export function useToggle(setMine: React.Dispatch<React.SetStateAction<Mine>>, refresh: () => Promise<void>) {
  const { user } = useSession();
  return useCallback(
    async (kind: "likes" | "reshares", id: string, active: boolean) => {
      if (!user) return "Inicia sesión para apoyar o republicar.";
      const table = browserDb().from(kind);
      const { error } = active
        ? await table.delete().eq("proposal_id", id).eq("user_id", user.id)
        : await table.insert({ proposal_id: id, user_id: user.id });
      if (error) return error.code === "P0001" ? error.message : "No pudimos guardar el cambio. Inténtalo de nuevo.";
      setMine((m) => {
        const next = { likes: new Set(m.likes), reshares: new Set(m.reshares) };
        if (active) next[kind].delete(id);
        else next[kind].add(id);
        return next;
      });
      await refresh();
      return null;
    },
    [user, setMine, refresh],
  );
}

const PAGE = 12;
const dateFilters = [
  { value: "", label: "Cualquier fecha" },
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "365", label: "Último año" },
];

export function Feed({ authorId, title = "Propuestas de la comunidad" }: { authorId?: string; title?: string }) {
  const [items, setItems] = useState<Proposal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState("");
  const [days, setDays] = useState("");
  const [sort, setSort] = useState("recent");
  const [territory, setTerritory] = useState<TerritoryValue>(emptyTerritory);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const refresh = useCallback(async () => {
    if (!configured) return;
    let q = browserDb().from("proposals").select(proposalSelect, { count: "exact" }).eq("hidden", false);
    if (authorId) q = q.eq("author_id", authorId);
    if (category) q = q.eq("category", category);
    if (scope === "nacional") q = q.is("province", null);
    if (scope === "local") q = q.not("province", "is", null);
    if (territory.province) q = q.eq("province", territory.province);
    if (territory.district) q = q.eq("district", territory.district);
    if (territory.corregimiento) q = q.eq("corregimiento", territory.corregimiento);
    if (days) q = q.gte("created_at", new Date(Date.now() - Number(days) * 86400000).toISOString());
    const text = normalize(debounced).replace(/[%_\\,()]/g, " ").trim();
    if (text) q = q.ilike("search_text", `%${text}%`);
    q = sort === "popular"
      ? q.order("popularity", { ascending: false }).order("created_at", { ascending: false })
      : q.order("created_at", { ascending: false });
    const { data, count, error: e } = await q.range(0, limit - 1);
    if (e) setError("No pudimos cargar las propuestas. Vuelve a intentarlo.");
    else {
      setError("");
      setItems((data as unknown as Proposal[]) ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [authorId, category, scope, territory, days, debounced, sort, limit]);

  useEffect(() => {
    // Loading persisted proposals is synchronisation with the database.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const [mine, setMine] = useInteractions(items.map((p) => p.id));
  const covers = useCovers(items.map((p) => p.id));
  const toggle = useToggle(setMine, refresh);
  const resetPage = () => setLimit(PAGE);

  return (
    <section aria-labelledby="feed-title">
      <div className="feed-head">
        <h2 id="feed-title">{title}</h2>
        <label className="muted" style={{ fontSize: "0.9rem" }}>
          Ordenar por{" "}
          <select aria-label="Ordenar" value={sort} onChange={(e) => { setSort(e.target.value); resetPage(); }} style={{ display: "inline-block", width: "auto", marginLeft: 6 }}>
            <option value="recent">Más recientes</option>
            <option value="popular">Más populares</option>
          </select>
        </label>
      </div>
      <div className="card filters">
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} aria-hidden="true" />
            <input aria-label="Buscar propuestas" placeholder="Buscar por palabra, con o sin tildes" value={query} onChange={(e) => { setQuery(e.target.value); resetPage(); }} />
          </div>
          <select aria-label="Temática" value={category} onChange={(e) => { setCategory(e.target.value); resetPage(); }}>
            <option value="">Todas las temáticas</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Alcance" value={scope} onChange={(e) => { setScope(e.target.value); resetPage(); }}>
            <option value="">Todo alcance</option>
            <option value="nacional">Para todo Panamá</option>
            <option value="local">Ubicación específica</option>
          </select>
          <select aria-label="Fecha" value={days} onChange={(e) => { setDays(e.target.value); resetPage(); }}>
            {dateFilters.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <TerritorySelect value={territory} allLabel="Cualquier provincia" onChange={(v) => { setTerritory(v); resetPage(); }} />
        <div className="chips" role="group" aria-label="Temáticas">
          {["", ...categories].map((c) => (
            <button key={c || "todas"} className="chip" aria-pressed={category === c} onClick={() => { setCategory(c); resetPage(); }}>
              {c || "Todas"}
            </button>
          ))}
        </div>
      </div>
      <Notice tone="error" message={error} />
      {!configured && <Notice tone="warn" message="La base de datos no está configurada en este entorno." />}
      {loading ? (
        <p className="loading">Cargando propuestas…</p>
      ) : items.length ? (
        <>
          <p className="results-line" aria-live="polite">{total} {total === 1 ? "propuesta" : "propuestas"}</p>
          <div className="feed-grid">
            {items.map((p) => <ProposalCard key={p.id} proposal={p} mine={mine} onToggle={toggle} cover={covers.get(p.id)} />)}
          </div>
          {items.length < total && (
            <p style={{ textAlign: "center", marginTop: 20 }}>
              <button className="button secondary" onClick={() => setLimit(limit + PAGE)}>Cargar más propuestas</button>
            </p>
          )}
        </>
      ) : (
        <div className="empty">
          <h2>{debounced || category || scope || days || territory.province ? "No hay propuestas con estos filtros." : "Todavía no hay propuestas."}</h2>
          <p>
            {debounced || category || scope || days || territory.province
              ? "Prueba con otra palabra, temática o ubicación."
              : "Haz una propuesta que te interesaría: a alguien le puede interesar tu idea."}
          </p>
          {!authorId && <Link className="button accent" href="/crear">Hacer una propuesta</Link>}
        </div>
      )}
    </section>
  );
}
