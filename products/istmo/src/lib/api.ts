import { serverDb, adminDb } from "./supabase/server";
export async function requireUser() {
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Inicia sesión para continuar.");
  return { db, user };
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    throw new Error("Solicitud no autorizada.");
}
export function apiError(error: unknown, status = 400) {
  return Response.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo completar la solicitud.",
    },
    { status },
  );
}
export async function limit(userId: string, action: string, max: number) {
  const { data, error } = await adminDb().rpc("consume_limit", {
    p_user: userId,
    p_action: action,
    p_limit: max,
  });
  if (error) throw new Error("No se pudo verificar el límite de uso.");
  if (!data)
    throw new Error("Has alcanzado el límite de hoy. Puedes continuar mañana.");
}
