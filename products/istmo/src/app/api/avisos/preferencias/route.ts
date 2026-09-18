import { z } from "zod";
import { apiError, checkOrigin, requireUser } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";

const schema = z.object({ digest: z.boolean().optional(), messagesFrom: z.enum(["todos", "nadie"]).optional() });

export async function GET() {
  try {
    const { db, user } = await requireUser();
    const { data } = await db.from("user_settings").select("digest,messages_from").eq("user_id", user.id).maybeSingle();
    // No row yet means nobody has changed anything: both defaults are on.
    return Response.json({ digest: data?.digest ?? true, messagesFrom: data?.messages_from ?? "todos" });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { user } = await requireUser();
    const input = schema.parse(await req.json());
    const db = adminDb();
    const { data: current } = await db.from("user_settings").select("digest,messages_from").eq("user_id", user.id).maybeSingle();
    const next = {
      user_id: user.id,
      digest: input.digest ?? current?.digest ?? true,
      messages_from: input.messagesFrom ?? current?.messages_from ?? "todos",
      updated_at: new Date().toISOString(),
    };
    // The row may not exist yet and clients cannot insert into this table.
    const { error } = await db.from("user_settings").upsert(next, { onConflict: "user_id" });
    if (error) throw new Error("No se pudo guardar tu preferencia.");
    return Response.json({ digest: next.digest, messagesFrom: next.messages_from });
  } catch (e) {
    return apiError(e);
  }
}
