import { after } from "next/server";
import { z } from "zod";
import { apiError, checkOrigin, requireUser, limit } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";
import { runResearch } from "@/lib/research";

export const maxDuration = 300;

// Optional web research that complements the reviewed directory. Runs in the background
// with persisted progress; a partial unique index prevents two active jobs per proposal.
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { db, user } = await requireUser();
    const input = z.object({ proposalId: z.uuid(), depth: z.enum(["standard", "deep"]) }).parse(await req.json());
    const { data: p } = await db
      .from("proposals")
      .select("id")
      .eq("id", input.proposalId)
      .eq("author_id", user.id)
      .eq("hidden", false)
      .maybeSingle();
    if (!p) throw new Error("Solo el autor puede investigar destinatarios.");
    if (!process.env.TAVILY_API_KEY)
      return Response.json(
        { error: "La búsqueda web requiere configuración (TAVILY_API_KEY). Mientras tanto, usa los responsables del directorio." },
        { status: 503 },
      );
    const admin = adminDb();
    const { data: existing } = await admin
      .from("research_jobs")
      .select("*")
      .eq("proposal_id", p.id)
      .in("status", ["queued", "running"])
      .maybeSingle();
    if (existing) return Response.json(existing);
    await limit(user.id, "research", 10);
    const { data: job, error } = await admin
      .from("research_jobs")
      .insert({ proposal_id: p.id, user_id: user.id, depth: input.depth, status: "queued" })
      .select("*")
      .single();
    if (error) throw new Error("Ya hay una búsqueda en curso para esta propuesta.");
    after(() => runResearch(job.id));
    return Response.json(job);
  } catch (e) {
    return apiError(e);
  }
}
