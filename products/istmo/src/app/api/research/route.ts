import { after } from "next/server";
import { z } from "zod";
import { apiError, checkOrigin, requireUser, limit } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";
import { rankContacts, researchStep } from "@/lib/research";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { db, user } = await requireUser();
    const input = z
      .object({ proposalId: z.uuid(), depth: z.enum(["standard", "deep"]) })
      .parse(await req.json());
    const { data: p } = await db
      .from("proposals")
      .select("*")
      .eq("id", input.proposalId)
      .eq("author_id", user.id)
      .eq("hidden", false)
      .single();
    if (!p) throw new Error("Solo el autor puede investigar destinatarios.");
    const admin = adminDb();
    const { data: existing } = await admin
      .from("research_jobs")
      .select("*")
      .eq("proposal_id", p.id)
      .in("status", ["queued", "running"])
      .maybeSingle();
    if (existing) return Response.json(existing);
    await limit(user.id, "research", 10);
    const results = rankContacts(p);
    const enabled = Boolean(process.env.TAVILY_API_KEY);
    const { data: job, error } = await admin
      .from("research_jobs")
      .insert({
        proposal_id: p.id,
        user_id: user.id,
        depth: input.depth,
        results,
        status: enabled ? "queued" : "partial",
        error: enabled
          ? null
          : "La búsqueda web requiere configuración. Estos resultados proceden del directorio inicial.",
        progress: enabled ? 0 : 100,
      })
      .select("*")
      .single();
    if (error)
      throw new Error("Ya existe una búsqueda o no se pudo iniciarla.");
    if (enabled) after(() => researchStep(job.id));
    return Response.json(job);
  } catch (e) {
    return apiError(e);
  }
}
