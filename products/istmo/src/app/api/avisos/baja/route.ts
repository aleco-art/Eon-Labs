import { z } from "zod";
import { apiError, checkOrigin } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";

const schema = z.object({ token: z.uuid() });

/** The token from the email is the proof: unsubscribing must work without signing in. */
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { token } = schema.parse(await req.json());
    const { data, error } = await adminDb().rpc("stop_digest", { p_token: token });
    if (error) throw new Error("No se pudo guardar la baja.");
    if (!data) return Response.json({ error: "Este enlace ya no es válido." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
