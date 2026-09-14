import { apiError, checkOrigin, requireUser } from "@/lib/api";
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { id } = await params;
    const { db, user } = await requireUser();
    const { data: p } = await db
      .from("proposals")
      .select("id")
      .eq("id", id)
      .eq("author_id", user.id)
      .single();
    if (!p) throw new Error("No puedes eliminar esta propuesta.");
    const { data: files } = await db
      .from("attachments")
      .select("path")
      .eq("proposal_id", id);
    if (files?.length) {
      const { error } = await db.storage
        .from("proposal-files")
        .remove(files.map((f) => f.path));
      if (error)
        throw new Error(
          "No se pudieron eliminar los archivos. Inténtalo de nuevo.",
        );
    }
    const { error } = await db
      .from("proposals")
      .delete()
      .eq("id", id)
      .eq("author_id", user.id);
    if (error) throw new Error("No se pudo eliminar la propuesta.");
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
