import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { adminDb } from "@/lib/supabase/server";
import { runResearch } from "@/lib/research";
export const maxDuration = 300;
export async function POST(req: Request) {
  const expected = process.env.RESEARCH_WORKER_SECRET;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (
    !expected ||
    Buffer.byteLength(expected) !== Buffer.byteLength(provided) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  )
    return new Response("Unauthorized", { status: 401 });
  const db = adminDb();
  await db
    .from("research_jobs")
    .update({
      status: "partial",
      error: "Ejecución interrumpida. Inicia otra búsqueda para continuar.",
    })
    .eq("status", "running")
    .lt("updated_at", new Date(Date.now() - 90000).toISOString());
  const { data } = await db
    .from("research_jobs")
    .select("id")
    .eq("status", "queued")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (data) after(() => runResearch(data.id));
  return Response.json({ scheduled: Boolean(data) });
}
