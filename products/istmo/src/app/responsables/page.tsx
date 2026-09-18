"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Mail, Phone, Search } from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
import { categories, dateLabel, normalize } from "@/lib/domain";
import { useTerritories } from "@/lib/territories";
import { Notice, ReportButton } from "@/components/common";
import { SuggestResponsable } from "@/components/suggest";

type Row = {
  id: string; name: string; entity_type: string; role_title: string | null; person_name: string | null; areas: string[];
  level: "nacional" | "provincial" | "distrital"; province_code: string | null; district_code: string | null; email: string | null;
  generic_domain: boolean; contact_url: string | null; phone: string | null; competence: string; source_url: string;
  source_title: string | null; source_kind: "oficial" | "otra_publica"; checked_at: string; status: string; notes: string | null;
};

export default function Responsables() {
  const { territories } = useTerritories();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [province, setProvince] = useState("");
  const [level, setLevel] = useState("");
  const [onlyEmail, setOnlyEmail] = useState(false);

  useEffect(() => {
    if (!configured) return;
    browserDb()
      .from("responsables")
      .select("*")
      .order("level")
      .order("name")
      .then(({ data, error: e }) => (e ? setError("No se pudo cargar el directorio.") : setRows(data as Row[])));
  }, []);

  const provinces = useMemo(
    () => [...new Map((territories ?? []).map((t) => [t.province_code, t.province])).entries()],
    [territories],
  );
  const placeOf = (r: Row) => {
    if (r.level === "nacional") return "Alcance nacional";
    const t = territories?.find((x) => (r.district_code ? x.district_code === r.district_code : x.province_code === r.province_code));
    return t ? (r.district_code ? `Distrito de ${t.district}, ${t.province}` : t.province) : "…";
  };
  const filtered = (rows ?? []).filter(
    (r) =>
      (!area || r.areas.includes(area)) &&
      (!province || r.province_code === province || (r.level === "nacional" && !level)) &&
      (!level || r.level === level) &&
      (!onlyEmail || r.email) &&
      (!q || normalize([r.name, r.role_title, r.competence, r.entity_type, placeOf(r)].join(" ")).includes(normalize(q))),
  );

  return (
    <div className="page">
      <p className="eyebrow">Directorio</p>
      <h1>Responsables por área</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        Entidades, oficinas y organizaciones con competencia en cada temática, con su canal de contacto publicado, la fuente y la fecha de consulta.
        Estar en esta lista no significa que respalden ninguna propuesta. <Link className="text-button" href="/fuentes">Cómo se construyó</Link>.
      </p>
      <SuggestResponsable />
      <div className="card filters" style={{ marginTop: 20 }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} aria-hidden="true" />
            <input aria-label="Buscar responsables" placeholder="Buscar entidad, cargo o distrito" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select aria-label="Área" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Todas las áreas</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Provincia" value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="">Todo Panamá</option>
            {provinces.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
          <select aria-label="Nivel" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Todos los niveles</option>
            <option value="nacional">Nacional</option>
            <option value="provincial">Provincial o regional</option>
            <option value="distrital">Municipal</option>
          </select>
        </div>
        <label className="check" style={{ margin: 0 }}>
          <input type="checkbox" checked={onlyEmail} onChange={(e) => setOnlyEmail(e.target.checked)} /> Solo con correo publicado
        </label>
      </div>
      <Notice tone="error" message={error} />
      {!rows && !error ? (
        <p className="loading">Cargando directorio…</p>
      ) : (
        <>
          <p className="results-line">{filtered.length} responsables · {filtered.filter((r) => r.email).length} con correo</p>
          <div className="directory-grid">
            {filtered.map((r) => (
              <article className="card entry" key={r.id}>
                <div className="meta">
                  <span className="tag">{r.entity_type}</span>
                  <span className={"badge " + (r.source_kind === "oficial" ? "official" : "public")}>
                    {r.source_kind === "oficial" ? "Fuente oficial" : "Otra fuente pública · por corroborar"}
                  </span>
                </div>
                <h3>{r.name}</h3>
                {(r.role_title || r.person_name) && <p style={{ color: "var(--ink)", fontWeight: 600 }}>{[r.role_title, r.person_name].filter(Boolean).join(" · ")}</p>}
                <p>{r.competence}</p>
                <p><b>{placeOf(r)}</b> · {r.areas.length === categories.length ? "Todas las áreas" : r.areas.join(", ")}</p>
                {r.email ? (
                  <span className="channel"><Mail size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> {r.email}</span>
                ) : (
                  <span className="channel" style={{ color: "var(--amber-700)" }}>Sin correo fiable publicado</span>
                )}
                {r.phone && <p><Phone size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> {r.phone}</p>}
                {r.contact_url && (
                  <a className="text-button" href={r.contact_url} target="_blank" rel="noreferrer">Canal de contacto <ExternalLink size={13} style={{ display: "inline" }} /></a>
                )}
                {r.notes && <p style={{ fontSize: "0.8rem" }}>{r.notes}</p>}
                <small className="muted">
                  Consultado el {dateLabel(r.checked_at)} · <a className="text-button" style={{ fontSize: "0.8rem" }} href={r.source_url} target="_blank" rel="noreferrer">{r.source_title ?? "Fuente"}</a>
                </small>
                <ReportButton target={{ responsableId: r.id }} label="Reportar dato incorrecto" />
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="empty">
              <h2>No hay responsables con estos filtros.</h2>
              <p>
                El directorio inicial no cubre todas las áreas y territorios. Desde tu propuesta puedes añadir un destinatario
                manualmente, o <a href="#sugerir">sugerir que lo añadamos</a> para todo el mundo.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
