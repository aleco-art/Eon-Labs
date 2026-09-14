"use client";
import { useState } from "react";
import contacts from "@/data/contacts.json";
import { categories, normalize, dateLabel, type Contact } from "@/lib/domain";
import { locationLabel } from "@/components/common";
import { ArrowUpRight } from "lucide-react";
export function ContactCard({ contact: c }: { contact: Contact }) {
  return (
    <article className="contact-card">
      <span className="category-tag">{c.kind}</span>
      <h2>{c.name}</h2>
      <p>{c.reason}</p>
      <small>
        {locationLabel(c.province, c.district)} · {c.categories.join(", ")}
      </small>
      {c.email && <p>{c.email}</p>}
      <small>
        {c.source_type} · Consultado el {dateLabel(c.checked_at)}
        <br />
        <a href={c.source_url} target="_blank" rel="noreferrer">
          Ver fuente ↗
        </a>
      </small>
      <a
        className="button secondary"
        href={c.url}
        target="_blank"
        rel="noreferrer"
      >
        Visitar canal de contacto
        <ArrowUpRight size={16} />
      </a>
    </article>
  );
}
export default function Directory() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const filtered = (contacts as Contact[]).filter(
    (c) =>
      (!cat || c.categories.includes(cat)) &&
      normalize(c.name + " " + c.reason).includes(normalize(q)),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONEXIONES CON PROPÓSITO</p>
          <h1>Las ideas necesitan aliados.</h1>
          <p>
            Un primer directorio de canales públicos. Encuentra destinatarios
            específicos desde tu propuesta.
          </p>
        </div>
      </div>
      <div className="search-row">
        <div className="search-box">
          <input
            aria-label="Buscar aliados"
            placeholder="Busca una organización o especialidad"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          aria-label="Temática del directorio"
          style={{ width: "auto", margin: 0 }}
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="">Todas las temáticas</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <p className="status-line">
        {filtered.length} canales encontrados · Directorio inicial, cobertura
        parcial
      </p>
      <div className="directory-grid">
        {filtered.map((c) => (
          <ContactCard key={c.id} contact={c} />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <h2>No hay contactos verificados para este filtro.</h2>
          <p>
            Puedes buscar destinatarios o añadir un contacto desde tu propuesta.
          </p>
        </div>
      )}
    </>
  );
}
