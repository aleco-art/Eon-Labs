import { z } from "zod";
import { apiError, checkOrigin, requireUser } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { db } = await requireUser();
    const { data: allowed } = await db.rpc("is_moderator");
    if (!allowed)
      return Response.json({ error: "Acceso denegado" }, { status: 403 });
    const input = z
      .object({
        reportId: z.uuid(),
        action: z.enum(["hide", "restore", "resolve"]),
      })
      .parse(await req.json());
    const admin = adminDb();
    const { data: r } = await admin
      .from("reports")
      .select("*")
      .eq("id", input.reportId)
      .single();
    if (!r) throw new Error("Reporte no disponible.");
    if (input.action !== "resolve") {
      const { error } = await admin
        .from(r.comment_id ? "comments" : "proposals")
        .update({ hidden: input.action === "hide" })
        .eq("id", r.comment_id ?? r.proposal_id);
      if (error) throw new Error("No se pudo actualizar el contenido.");
    }
    const { error } = await admin
      .from("reports")
      .update({ resolved: true })
      .eq("id", r.id);
    if (error) throw new Error("No se pudo actualizar el reporte.");
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
