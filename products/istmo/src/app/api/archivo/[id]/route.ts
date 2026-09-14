import { serverDb } from "@/lib/supabase/server";
import { apiError } from "@/lib/api";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = await serverDb();
    const { data } = await db
      .from("attachments")
      .select("path,name")
      .eq("id", id)
      .single();
    if (!data) return new Response("Archivo no disponible", { status: 404 });
    const { data: link, error } = await db.storage
      .from("proposal-files")
      .createSignedUrl(data.path, 60, { download: data.name });
    if (error) throw new Error("Archivo no disponible.");
    return Response.redirect(link.signedUrl, 302);
  } catch (e) {
    return apiError(e);
  }
}
