"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  MapPin,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Lightbulb,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
import { categories, dateLabel, normalize, type Proposal } from "@/lib/domain";
import { useSession } from "./shell";
import { locationLabel, Notice, TerritorySelect } from "./common";
export const proposalSelect =
  "*,profiles!proposals_author_id_fkey(*),likes(user_id),reshares(user_id),comments(id)";
export function ProposalCard({
  proposal: p,
  onChange,
}: {
  proposal: Proposal;
  onChange?: () => void;
}) {
  const { user } = useSession();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function toggle(table: "likes" | "reshares") {
    if (!user) {
      setMessage("Inicia sesión para participar.");
      return;
    }
    setBusy(true);
    const active = p[table].some((x) => x.user_id === user.id);
    const q = browserDb().from(table);
    const { error } = active
      ? await q.delete().eq("proposal_id", p.id).eq("user_id", user.id)
      : await q.insert({ proposal_id: p.id, user_id: user.id });
    setBusy(false);
    if (error) setMessage("No pudimos guardar el cambio. Inténtalo de nuevo.");
    else onChange?.();
  }
  return (
    <article className="proposal-card">
      <div className="card-meta">
        <span className={"category-tag cat-" + categories.indexOf(p.category)}>
          {p.category}
        </span>
        <span>
          <MapPin size={13} />
          {locationLabel(p.province, p.district, p.corregimiento)}
        </span>
        <span className="card-date">{dateLabel(p.created_at)}</span>
      </div>
      <Link href={"/propuesta/" + p.id} className="proposal-title">
        <h2>{p.title}</h2>
        <ArrowUpRight size={22} />
      </Link>
      <p className="proposal-excerpt">{p.body}</p>
      <div className="author-line">
        <Link className="avatar" href={"/perfil/" + p.author_id}>
          {p.profiles?.name?.slice(0, 1) ?? "C"}
        </Link>
        <Link href={"/perfil/" + p.author_id}>
          {p.profiles?.name ?? "Ciudadano"}
        </Link>
        <span className="publication-state">
          {p.shared_at ? "Compartida con destinatarios" : "Publicada"}
        </span>
      </div>
      <div className="card-actions">
        <button
          disabled={busy}
          aria-label="Me gusta"
          aria-pressed={p.likes.some((x) => x.user_id === user?.id)}
          onClick={() => toggle("likes")}
        >
          <Heart size={18} />
          {p.likes.length}
          <span>Apoyos</span>
        </button>
        <Link href={"/propuesta/" + p.id + "#conversacion"}>
          <MessageCircle size={18} />
          {p.comments.length}
          <span>Comentarios</span>
        </Link>
        <button
          disabled={busy}
          aria-label="Republicar"
          aria-pressed={p.reshares.some((x) => x.user_id === user?.id)}
          onClick={() => toggle("reshares")}
        >
          <Repeat2 size={18} />
          {p.reshares.length}
        </button>
        <button
          className="share-action"
          aria-label="Copiar enlace"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                location.origin + "/propuesta/" + p.id,
              );
              setMessage("Enlace copiado.");
            } catch {
              setMessage(
                "Puedes copiar el enlace desde la página de la propuesta.",
              );
            }
          }}
        >
          <Share2 size={17} />
        </button>
      </div>
      <Notice message={message} />
    </article>
  );
}
export function Feed({ authorId }: { authorId?: string }) {
  const [items, setItems] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(configured);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recent");
  const [filters, setFilters] = useState(false);
  const [territory, setTerritory] = useState({
    province: "",
    district: "",
    corregimiento: "",
  });
  const [page, setPage] = useState(1);
  async function refresh() {
    if (!configured) return;
    let q = browserDb()
      .from("proposals")
      .select(proposalSelect)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(500);
    if (authorId) q = q.eq("author_id", authorId);
    const { data, error } = await q;
    if (error)
      setMessage("No pudimos cargar las propuestas. Vuelve a intentarlo.");
    else setItems((data as unknown as Proposal[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    // Synchronize the feed with the external database when its author changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [authorId]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = items
    .filter(
      (p) =>
        (!category || p.category === category) &&
        (!query ||
          normalize(p.title + " " + p.body).includes(normalize(query))) &&
        (!territory.province || p.province === territory.province) &&
        (!territory.district || p.district === territory.district) &&
        (!territory.corregimiento ||
          p.corregimiento === territory.corregimiento),
    )
    .sort((a, b) =>
      sort === "popular"
        ? b.likes.length - a.likes.length
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">IDEAS LOCALES. POSIBILIDADES REALES.</p>
          <h1>
            {authorId ? "Propuestas publicadas" : "¿Qué Panamá imaginamos?"}
          </h1>
          <p>
            Un espacio para proponer, conversar y conectar con quienes pueden
            hacerlo posible.
          </p>
        </div>
        <span className="edition">
          ABIERTO A<br />
          <b>TODAS LAS IDEAS</b>
        </span>
      </div>
      <div className="feed-layout">
        <section className="feed-column">
          <Link className="composer" href="/crear">
            <span className="composer-icon">
              <Lightbulb size={23} />
            </span>
            <span>
              <b>Tu próxima idea puede empezar algo.</b>
              <small>Compártela con Panamá</small>
            </span>
            <span className="composer-plus">+</span>
          </Link>
          <div className="search-row">
            <div className="search-box">
              <Search size={19} />
              <input
                aria-label="Buscar propuestas"
                placeholder="Busca una idea, un tema, una posibilidad…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <button
              className={"filter-button " + (filters ? "selected" : "")}
              aria-expanded={filters}
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={18} />
              Ubicación
            </button>
          </div>
          {filters && (
            <div className="filter-panel">
              <TerritorySelect
                value={territory}
                onChange={(v) => {
                  setTerritory(v);
                  setPage(1);
                }}
              />
            </div>
          )}
          <div className="category-list">
            {["", ...categories].map((c) => (
              <button
                className={c === category ? "chip selected" : "chip"}
                key={c}
                onClick={() => {
                  setCategory(c);
                  setPage(1);
                }}
              >
                {c || "Todas las ideas"}
              </button>
            ))}
          </div>
          <div className="feed-toolbar">
            <b>
              {filtered.length}{" "}
              {filtered.length === 1 ? "propuesta" : "propuestas"}
            </b>
            <label className="sort-label">
              Ordenar por
              <select
                aria-label="Ordenar propuestas"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recent">Más recientes</option>
                <option value="popular">Más apoyadas</option>
              </select>
            </label>
          </div>
          <Notice message={message} />
          {loading ? (
            <div className="empty-state">Cargando propuestas…</div>
          ) : filtered.length ? (
            filtered
              .slice(0, page * 15)
              .map((p) => (
                <ProposalCard key={p.id} proposal={p} onChange={refresh} />
              ))
          ) : (
            <div className="empty-state">
              <span className="empty-icon">
                <Lightbulb size={34} />
              </span>
              <p className="eyebrow">HAY ESPACIO PARA TU IDEA</p>
              <h2>
                {items.length
                  ? "Todavía no hay coincidencias."
                  : "Las buenas conversaciones\nempiezan con una propuesta."}
              </h2>
              <p>
                {items.length
                  ? "Prueba otro tema o amplía la ubicación."
                  : "Una calle más caminable, un festival en tu barrio, una nueva ruta turística. ¿Por dónde empezamos?"}
              </p>
              <Link className="button primary" href="/crear">
                Publicar la primera idea
                <ArrowUpRight size={18} />
              </Link>
              {!configured && (
                <small className="setup-note">
                  Estamos preparando las cuentas y publicaciones. Ya puedes
                  explorar el directorio y las fuentes.
                </small>
              )}
            </div>
          )}
          {filtered.length > page * 15 && (
            <button
              className="button secondary"
              onClick={() => setPage(page + 1)}
            >
              Ver más propuestas
            </button>
          )}
        </section>
        <aside className="right-column">
          <section className="connection-panel">
            <p className="eyebrow">DE LA IDEA A LA CONEXIÓN</p>
            <h2>
              Alguien puede
              <br />
              estar buscando
              <br />
              <em>tu idea.</em>
            </h2>
            <p>
              Arquitectos, alcaldías, negocios, organizadores. Encuentra a quién
              hacerle llegar tu propuesta.
            </p>
            <Link href="/directorio">
              Explorar aliados
              <ArrowUpRight size={20} />
            </Link>
          </section>
          <section className="how-panel">
            <p className="eyebrow">ASÍ EMPIEZA</p>
            {[
              [
                "01",
                "Comparte tu idea",
                "Dale contexto, un lugar y una intención.",
              ],
              [
                "02",
                "Suma otras voces",
                "Los comentarios hacen crecer la propuesta.",
              ],
              [
                "03",
                "Encuentra conexiones",
                "Revisa destinatarios y decide a quién escribir.",
              ],
            ].map(([n, t, d]) => (
              <div className="how-step" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </section>
          <Link href="/fuentes" className="source-note">
            <BookIcon />
            <span>
              Panamá, con datos de origen.
              <small>Consulta nuestras fuentes oficiales.</small>
            </span>
            <ArrowRight size={17} />
          </Link>
          <p className="platform-note">
            Istmo conecta personas e ideas. La ejecución depende de quienes
            decidan impulsarlas.
          </p>
        </aside>
      </div>
    </>
  );
}
function BookIcon() {
  return <MapPin size={23} />;
}
