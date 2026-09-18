import { z } from "zod";
import { apiError, checkOrigin, requireUser } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";

// Moderation handles spam, abuse and inappropriate files. It never judges a proposal's merit.
const schema = z.object({
  reportId: z.uuid(),
  action: z.enum(["hide", "restore", "resolve", "dismiss", "flag_entry"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { db, user } = await requireUser();
    const { data: allowed } = await db.rpc("is_moderator");
    if (!allowed) return Response.json({ error: "Acceso denegado." }, { status: 403 });
    const input = schema.parse(await req.json());
    const admin = adminDb();
    const { data: r } = await admin.from("reports").select("*").eq("id", input.reportId).maybeSingle();
    if (!r) throw new Error("Reporte no disponible.");

    const target = r.message_id
      ? { table: "messages", id: r.message_id, type: "mensaje" }
      : r.attachment_id
      ? { table: "attachments", id: r.attachment_id, type: "archivo" }
      : r.comment_id
        ? { table: "comments", id: r.comment_id, type: "comentario" }
        : r.responsable_id
          ? { table: "responsables", id: r.responsable_id, type: "responsable" }
          : { table: "proposals", id: r.proposal_id, type: "propuesta" };

    if (input.action === "hide" || input.action === "restore") {
      if (target.table === "responsables") throw new Error("Los datos del directorio se marcan para revisión, no se ocultan.");
      const { error } = await admin.from(target.table).update({ hidden: input.action === "hide" }).eq("id", target.id);
      if (error) throw new Error("No se pudo actualizar el contenido.");
    }
    if (input.action === "flag_entry") {
      if (target.table !== "responsables") throw new Error("Esta acción solo aplica a datos del directorio.");
      const { error } = await admin.from("responsables").update({ status: "revisar", updated_at: new Date().toISOString() }).eq("id", target.id);
      if (error) throw new Error("No se pudo marcar el dato para revisión.");
    }
    const closes = input.action !== "restore";
    if (closes) {
      const { error } = await admin.from("reports").update({ resolved: true }).eq("id", r.id);
      if (error) throw new Error("No se pudo cerrar el reporte.");
    }
    await admin.from("moderation_log").insert({
      moderator_id: user.id,
      action: input.action,
      target_type: target.type,
      target_id: String(target.id),
      report_id: r.id,
      note: input.note ?? null,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
