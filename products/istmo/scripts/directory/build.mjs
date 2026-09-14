// Builds supabase/migrations/004_directory_seed.sql and src/data/directory-coverage.json
// from the reviewed sources in this folder. Re-run after editing curated.json or amupa output.
import fs from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = async (p) => JSON.parse(await fs.readFile(new URL(p, root), "utf8"));
const territories = await read("src/data/territories.json");
const curated = await read("scripts/directory/curated.json");
const amupa = await read("scripts/directory/amupa-municipios.json");
const CHECKED = "2026-09-14";
const ALL_AREAS = ["Gubernamental", "Urbanización", "Eventos", "Turismo", "Cultura", "Gastronomía", "Medioambiente", "Deportes", "Emprendimiento", "Otras"];
const provinces = new Map(territories.map((t) => [t.province_code, t.province]));
const districts = new Map(territories.map((t) => [t.district_code, t]));

const rows = [];
for (const n of curated.national) {
  rows.push({ level: n.level ?? "nacional", province_code: n.province_code ?? null, district_code: n.district_code ?? null, person_name: null, phone: n.phone ?? null, generic_domain: false, checked_at: CHECKED, notes: n.notes ?? null, ...n });
}
for (const o of curated.atp_regional.offices) {
  rows.push({
    id: "atp-regional-" + o.province_code, name: "Autoridad de Turismo de Panamá", entity_type: "Entidad nacional · oficina regional",
    role_title: "Oficina Regional de " + o.office, person_name: o.person_name, areas: ["Turismo", "Eventos", "Gastronomía"],
    level: "provincial", province_code: o.province_code, district_code: null, email: o.email, generic_domain: false,
    contact_url: curated.atp_regional.source_url, phone: o.phone,
    competence: "Representa a la ATP en " + provinces.get(o.province_code) + ": promoción y desarrollo turístico regional.",
    source_url: curated.atp_regional.source_url, source_title: curated.atp_regional.source_title, source_kind: "oficial", checked_at: CHECKED, notes: null,
  });
}
for (const m of amupa.municipalities) {
  const d = districts.get(m.district_code);
  rows.push({
    id: m.id, name: m.name, entity_type: "Municipio", role_title: "Alcaldía · despacho municipal", person_name: null,
    areas: ALL_AREAS, level: "distrital", province_code: m.province_code, district_code: m.district_code,
    email: m.email, generic_domain: m.generic_domain, contact_url: null, phone: m.phone,
    competence: `Gobierno local del distrito de ${d.district}: espacio público, obras y servicios municipales, permisos y actividades comunitarias.`,
    source_url: m.source_url, source_title: "AMUPA · Directorio de Alcaldes de Panamá 2024-2029 (oct. 2024)", source_kind: "otra_publica",
    checked_at: m.checked_at,
    notes: [m.generic_domain ? "Correo con dominio genérico publicado por AMUPA." : null, "Pendiente de corroborar en un sitio oficial del municipio."].filter(Boolean).join(" "),
    status: m.email ? "activo" : "revisar",
  });
}

// Validation: codes must exist and relations must be coherent.
const ids = new Set();
for (const r of rows) {
  if (ids.has(r.id)) throw new Error("Duplicate id " + r.id);
  ids.add(r.id);
  if (r.province_code && !provinces.has(r.province_code)) throw new Error("Bad province " + r.id);
  if (r.district_code && (!districts.has(r.district_code) || districts.get(r.district_code).province_code !== r.province_code)) throw new Error("Bad district " + r.id);
  for (const a of r.areas) if (!ALL_AREAS.includes(a)) throw new Error("Bad area " + a + " in " + r.id);
  if (r.email && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(r.email)) throw new Error("Bad email " + r.id);
}

// Search aliases: INEC 2023 census spellings (cross-check of 14-sep-2026) plus the parts of
// official names joined by " o " or with a parenthesised alternative. Official names stay intact.
const inecAliases = {
  "010406": ["Valle del Risco"], "060302": ["Capurí"], "060405": ["Peñas Chatas"], "090302": ["Cerro de Plata"],
  "120310": ["Roka"], "120403": ["Jädaberi"], "120511": ["El Piro No.2"], "120604": ["Guoroni"], "120803": ["Guariviara"],
  "120805": ["Tuwai"], "120901": ["Santa Catalina o Calovébora"], "120902": ["Alto Bilingüe"], "120903": ["Loma Yuca"],
  "120904": ["San Pedrito"], "120905": ["Valle Bonito"], "040401": ["Bajo Boquete"], "060607": ["Sabanagrande"], "070310": ["Sabanagrande"],
};
const aliasRows = [];
for (const t of territories) {
  const set = new Set(inecAliases[t.code] ?? []);
  for (const part of t.name.split(/ o |\(|\)/).map((s) => s.trim()).filter(Boolean)) if (part !== t.name && part.length > 2) set.add(part);
  if (t.province_code === "10") set.add("Guna Yala");
  if (set.size) aliasRows.push([t.code, [...set]]);
}

const q = (v) => (v === null || v === undefined ? "null" : "'" + String(v).replaceAll("'", "''") + "'");
const arr = (a) => "array[" + a.map(q).join(",") + "]::text[]";
const cols = ["id", "name", "entity_type", "role_title", "person_name", "areas", "level", "province_code", "district_code", "email", "generic_domain", "contact_url", "phone", "competence", "source_url", "source_title", "source_kind", "checked_at", "status", "notes"];
const sql = [
  "-- Generated by scripts/directory/build.mjs. Do not edit by hand.",
  `insert into public.responsables (${cols.join(",")}) values`,
  rows.map((r) => "(" + cols.map((c) => (c === "areas" ? arr(r.areas) : c === "generic_domain" ? String(Boolean(r.generic_domain)) : q(c === "status" ? r.status ?? "activo" : r[c]))).join(",") + ")").join(",\n"),
  "on conflict (id) do update set " + cols.filter((c) => c !== "id").map((c) => `${c}=excluded.${c}`).join(", ") + ", updated_at=now();",
  "",
  ...aliasRows.map(([code, aliases]) => `update public.territories set aliases=${arr(aliases)} where code=${q(code)};`),
  "",
].join("\n");
await fs.writeFile(new URL("supabase/migrations/004_directory_seed.sql", root), sql);

const districtCodes = [...districts.keys()];
const withMunicipalEmail = new Set(rows.filter((r) => r.level === "distrital" && r.email && r.entity_type === "Municipio").map((r) => r.district_code));
const coverage = {
  checked_at: CHECKED,
  total: rows.length,
  with_email: rows.filter((r) => r.email).length,
  official: rows.filter((r) => r.source_kind === "oficial").length,
  other_public: rows.filter((r) => r.source_kind === "otra_publica").length,
  national_entities: rows.filter((r) => r.level === "nacional").length,
  regional_offices: rows.filter((r) => r.level === "provincial").length,
  municipalities: rows.filter((r) => r.entity_type === "Municipio" && r.id.startsWith("municipio-")).length,
  districts_total: districtCodes.length,
  districts_with_municipal_email: withMunicipalEmail.size,
  districts_without_municipal_email: districtCodes.filter((c) => !withMunicipalEmail.has(c)).map((c) => districts.get(c).province + " / " + districts.get(c).district),
  by_area: Object.fromEntries(ALL_AREAS.map((a) => [a, rows.filter((r) => r.areas.includes(a) && r.email && r.level !== "distrital").length])),
  atp_not_imported: curated.atp_regional.not_imported,
  rejected: curated.rejected,
  amupa_excluded: amupa.municipalities.flatMap((m) => m.excluded.map((e) => ({ municipality: m.name, reason: e.reason }))),
  territory_aliases: aliasRows.length,
};
await fs.writeFile(new URL("src/data/directory-coverage.json", root), JSON.stringify(coverage, null, 2) + "\n");
console.log(JSON.stringify({ ...coverage, districts_without_municipal_email: coverage.districts_without_municipal_email.length, rejected: undefined, amupa_excluded: coverage.amupa_excluded.length }, null, 1));
