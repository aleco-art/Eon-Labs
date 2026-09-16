import { z } from "zod";
import { apiError, checkOrigin, requireUser } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";

const schema = z.object({ digest: z.boolean() });

export async function GET() {
  try {
    const { db, user } = await requireUser();
    const { data } = await db.from("email_settings").select("digest").eq("user_id", user.id).maybeSingle();
    // No row yet means nobody has changed anything: the daily summary is on by default.
    return Response.json({ digest: data?.digest ?? true });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { user } = await requireUser();
    const { digest } = schema.parse(await req.json());
    // The row may not exist yet and clients cannot insert into this table.
    const { error } = await adminDb()
      .from("email_settings")
      .upsert({ user_id: user.id, digest, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error("No se pudo guardar tu preferencia.");
    return Response.json({ digest });
  } catch (e) {
    return apiError(e);
  }
}
