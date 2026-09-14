import { after } from "next/server";
import { apiError, checkOrigin, requireUser } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";
import { researchStep } from "@/lib/research";
export const maxDuration = 60;
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { db } = await requireUser();
    const { data, error } = await db
      .from("research_jobs")
      .select("*")
      .eq("id", id)
      .single();
    if (error)
      return Response.json(
        { error: "Búsqueda no disponible" },
        { status: 404 },
      );
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { id } = await params;
    const { db } = await requireUser();
    const { data } = await db
      .from("research_jobs")
      .select("id,status,updated_at")
      .eq("id", id)
      .single();
    if (!data) throw new Error("Búsqueda no disponible.");
    if (
      data.status === "running" &&
      Date.now() - new Date(data.updated_at).getTime() > 90000
    ) {
      await adminDb()
        .from("research_jobs")
        .update({
          status: "partial",
          error:
            "La ejecución se interrumpió. Puedes iniciar una nueva búsqueda.",
        })
        .eq("id", id)
        .eq("status", "running");
    } else if (data.status === "queued") after(() => researchStep(id));
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { id } = await params;
    const { db, user } = await requireUser();
    const { data } = await db
      .from("research_jobs")
      .select("id")
      .eq("id", id)
      .single();
    if (!data) throw new Error("Búsqueda no disponible.");
    await adminDb()
      .from("research_jobs")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", user.id)
      .in("status", ["queued", "running"]);
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
