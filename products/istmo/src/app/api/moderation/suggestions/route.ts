import { z } from "zod";
import { apiError, checkOrigin, requireUser } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";

const schema = z.object({
  id: z.uuid(),
  action: z.enum(["accept", "reject"]),
  note: z.string().trim().max(500).optional(),
});

// Free mail providers: a responsable writing from one of these is flagged, as the directory does.
const generic = /@(gmail|hotmail|outlook|yahoo|live|icloud|aol|protonmail)\./i;

/** Moderators accept a suggestion into the public directory, or reject it with a reason. */
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { db, user } = await requireUser();
    const { data: allowed } = await db.rpc("is_moderator");
    if (!allowed) return Response.json({ error: "Acceso denegado." }, { status: 403 });
    const input = schema.parse(await req.json());
    const admin = adminDb();
    const { data: s } = await admin.from("responsable_suggestions").select("*").eq("id", input.id).maybeSingle();
    if (!s) throw new Error("Sugerencia no disponible.");
    if (s.status !== "pendiente") throw new Error("Esta sugerencia ya se revisó.");
    const now = new Date().toISOString();

    let responsableId: string | null = null;
    if (input.action === "accept") {
      responsableId = "sugerido-" + s.id.slice(0, 8);
      const host = new URL(s.source_url).hostname;
      const { error } = await admin.from("responsables").insert({
        id: responsableId,
        name: s.name,
        entity_type: s.entity_type,
        role_title: s.role_title,
        person_name: s.person_name,
        areas: s.areas,
        level: s.level,
        province_code: s.province_code,
        district_code: s.district_code,
        email: s.email,
        generic_domain: Boolean(s.email && generic.test(s.email)),
        contact_url: s.contact_url,
        phone: s.phone,
        competence: s.competence,
        source_url: s.source_url,
        source_title: null,
        source_kind: host.endsWith(".gob.pa") ? "oficial" : "otra_publica",
        checked_at: now.slice(0, 10),
        status: "activo",
        notes: "Sugerido por una persona usuaria y revisado por moderación.",
      });
      if (error) throw new Error("No se pudo publicar en el directorio.");
    }

    const { error: updateError } = await admin
      .from("responsable_suggestions")
      .update({
        status: input.action === "accept" ? "aceptada" : "rechazada",
        review_note: input.note ?? null,
        reviewed_at: now,
        responsable_id: responsableId,
      })
      .eq("id", s.id);
    if (updateError) throw new Error("No se pudo guardar la revisión.");

    await admin.from("moderation_log").insert({
      moderator_id: user.id,
      action: input.action === "accept" ? "accept_suggestion" : "reject_suggestion",
      target_type: "sugerencia",
      target_id: s.id,
      note: input.note ?? null,
    });
    return Response.json({ ok: true, responsableId });
  } catch (e) {
    return apiError(e);
  }
}
