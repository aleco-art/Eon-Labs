import { apiError, checkOrigin, requireUser } from "@/lib/api";
import { notificationSelect } from "@/lib/domain";

export async function GET() {
  try {
    const { db, user } = await requireUser();
    const [{ data: items }, { count }] = await Promise.all([
      db
        .from("notifications")
        .select(notificationSelect)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      db
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
    return Response.json({ items: items ?? [], unread: count ?? 0 });
  } catch (e) {
    return apiError(e);
  }
}

/** Opening the panel marks everything as read; the list itself stays. */
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { db, user } = await requireUser();
    const { error } = await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) throw new Error("No se pudieron marcar como leídas.");
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
