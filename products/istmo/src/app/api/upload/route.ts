import { checkOrigin, requireUser, apiError, limit } from "@/lib/api";
import { validateFile } from "@/lib/files";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { db, user } = await requireUser();
    await limit(user.id, "upload", 30);
    const f = await req.formData();
    const file = f.get("file");
    if (!(file instanceof File)) throw new Error("Selecciona un archivo.");
    await validateFile(file);
    const proposalId = z.uuid().parse(f.get("proposalId"));
    const { data: p } = await db
      .from("proposals")
      .select("id")
      .eq("id", proposalId)
      .eq("author_id", user.id)
      .single();
    if (!p) throw new Error("No puedes añadir archivos a esta propuesta.");
    const { count } = await db
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", proposalId);
    if ((count ?? 0) >= 5)
      throw new Error("Esta propuesta ya tiene cinco archivos.");
    const ext = (
      {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "application/pdf": "pdf",
      } as Record<string, string>
    )[file.type];
    const path = `${user.id}/${proposalId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage
      .from("proposal-files")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("No se pudo guardar el archivo.");
    const { error: metadataError } = await db
      .from("attachments")
      .insert({
        proposal_id: proposalId,
        owner_id: user.id,
        path,
        name: file.name.slice(0, 180),
        mime: file.type,
        size: file.size,
      });
    if (metadataError) {
      await db.storage.from("proposal-files").remove([path]);
      throw new Error("No se pudo registrar el archivo.");
    }
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
