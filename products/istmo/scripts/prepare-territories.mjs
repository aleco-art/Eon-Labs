import fs from "node:fs/promises";
const source =
  "https://services6.arcgis.com/LC15PAkubfypkSFO/arcgis/rest/services/corregimientos_panama/FeatureServer/0";
const raw = JSON.parse(
  (await fs.readFile("src/data/territory-source.json", "utf8")).replace(
    /^\uFEFF/,
    "",
  ),
);
if (raw.error || raw.exceededTransferLimit)
  throw new Error("Incomplete source");
const map = new Map();
for (const { attributes: a } of raw.features) {
  if (
    !/^\d{6}$/.test(a.cod_corr) ||
    !a.cod_corr.startsWith(a.cod_dist) ||
    !a.cod_dist.startsWith(a.cod_prov)
  )
    throw new Error("Invalid hierarchy");
  const row = {
    code: a.cod_corr,
    name: a.nomb_corr.trim(),
    province_code: a.cod_prov,
    province: a.nomb_prov.trim(),
    district_code: a.cod_dist,
    district: a.nomb_dist.trim(),
    source_url: source,
    checked_at: "2026-09-14",
  };
  if (
    map.has(row.code) &&
    JSON.stringify(map.get(row.code)) !== JSON.stringify(row)
  )
    throw new Error("Conflicting duplicate " + row.code);
  map.set(row.code, row);
}
const rows = [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
await fs.writeFile(
  "src/data/territories.json",
  JSON.stringify(rows, null, 2) + "\n",
);
const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
await fs.writeFile(
  "supabase/migrations/002_territories.sql",
  "insert into public.territories(code,name,province_code,province,district_code,district,source_url,checked_at) values\n" +
    rows
      .map((r) => "(" + Object.values(r).map(quote).join(",") + ")")
      .join(",\n") +
    "\non conflict(code) do update set name=excluded.name, province=excluded.province, district=excluded.district, checked_at=excluded.checked_at;\n",
);
console.log(
  JSON.stringify({
    features: raw.features.length,
    unique: rows.length,
    provinces: new Set(rows.map((r) => r.province_code)).size,
    districts: new Set(rows.map((r) => r.district_code)).size,
  }),
);
