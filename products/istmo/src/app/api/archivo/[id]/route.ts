import { serverDb } from "@/lib/supabase/server";
import { apiError } from "@/lib/api";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // Photos are shown in the page (?inline=1); everything else downloads with its name.
    const inline = new URL(req.url).searchParams.has("inline");
    const db = await serverDb();
    const { data } = await db
      .from("attachments")
      .select("path,name,mime")
      .eq("id", id)
      .single();
    if (!data) return new Response("Archivo no disponible", { status: 404 });
    const { data: link, error } = await db.storage
      .from("proposal-files")
      .createSignedUrl(data.path, 60, inline && data.mime.startsWith("image/") ? undefined : { download: data.name });
    if (error) throw new Error("Archivo no disponible.");
    return Response.redirect(link.signedUrl, 302);
  } catch (e) {
    return apiError(e);
  }
}
