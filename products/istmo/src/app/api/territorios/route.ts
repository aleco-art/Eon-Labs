import { createClient } from "@supabase/supabase-js";

// Territorial division is read from the database and cached at the edge for a day:
// it changes only when a new official source is imported, never per visit.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ error: "La base de datos requiere configuración." }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("territories")
      .select("code,name,province_code,province,district_code,district,aliases")
      .order("code")
      .range(from, from + 999);
    if (error) return Response.json({ error: "No se pudo cargar la división territorial." }, { status: 502 });
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return Response.json(rows, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
