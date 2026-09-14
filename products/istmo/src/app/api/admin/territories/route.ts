import { timingSafeEqual } from "node:crypto";
import { adminDb } from "@/lib/supabase/server";
import territories from "@/data/territories.json";

export async function POST(req: Request) {
  const expected = process.env.RESEARCH_WORKER_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (
    !expected ||
    Buffer.byteLength(expected) !== Buffer.byteLength(provided) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  const db = adminDb();
  for (let i = 0; i < territories.length; i += 150) {
    const { error } = await db.from("territories").upsert(territories.slice(i, i + 150));
    if (error) return Response.json({ error: "No se pudo cargar la división territorial." }, { status: 500 });
  }
  return Response.json({ territories: territories.length });
}
