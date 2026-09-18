import type { SupabaseClient } from "@supabase/supabase-js";

type Where = { province: string | null; district: string | null; corregimiento: string | null };

/** Readable location: corregimiento, district and province names, or all of Panama. */
export async function placeName(db: SupabaseClient, p: Where) {
  if (!p.province) return "Todo Panamá";
  let q = db.from("territories").select("name,district,province").eq("province_code", p.province);
  if (p.district) q = q.eq("district_code", p.district);
  if (p.corregimiento) q = q.eq("code", p.corregimiento);
  const { data } = await q.limit(1).maybeSingle();
  if (!data) return "Panamá";
  return [p.corregimiento ? data.name : null, p.district ? data.district : null, data.province].filter(Boolean).join(", ");
}
