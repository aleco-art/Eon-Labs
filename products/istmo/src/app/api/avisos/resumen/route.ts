import { createHash, timingSafeEqual } from "node:crypto";
import { adminDb } from "@/lib/supabase/server";
import { digestEmail, emailMode, noticeFrom, sendEmail, type DigestGroup } from "@/lib/email";
import { notificationLine, type NotificationKind } from "@/lib/domain";
import { siteName } from "@/lib/site";

export const maxDuration = 300;

type Item = {
  id: string;
  kind: NotificationKind;
  actor: string | null;
  proposal_id: string | null;
  conversation_id: string | null;
  title: string | null;
  created_at: string;
};
type Row = { author_id: string; author_email: string; author_name: string; unsubscribe_token: string; items: Item[] };

function authorised(req: Request) {
  // Vercel Cron sends CRON_SECRET as a bearer token; the same header works when run by hand.
  const expected = process.env.CRON_SECRET ?? process.env.RESEARCH_WORKER_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** One email per author with everything that happened since the last summary. */
async function run() {
  const mode = emailMode();
  if (!mode.configured) return { sent: 0, skipped: 0, reason: mode.reason };
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return { sent: 0, skipped: 0, reason: "Falta NEXT_PUBLIC_SITE_URL." };

  const db = adminDb();
  const { data, error } = await db.rpc("digest_queue");
  if (error) throw new Error("No se pudo leer la cola de resúmenes.");
  const rows = (data ?? []) as Row[];

  let sent = 0;
  let skipped = 0;
  for (const row of rows) {
    const items = row.items ?? [];
    if (!items.length) continue;
    const byProposal = new Map<string, DigestGroup>();
    for (const item of items) {
      const key = item.kind === "mensaje" ? "mensajes" : (item.proposal_id ?? "otros");
      const group = byProposal.get(key) ?? {
        title: item.kind === "mensaje" ? "Mensajes que recibiste" : (item.title ?? "Tu propuesta"),
        url:
          item.kind === "mensaje"
            ? new URL("/mensajes", base).href
            : item.proposal_id
              ? new URL("/propuesta/" + item.proposal_id, base).href
              : base,
        lines: [],
      };
      group.lines.push(notificationLine(item.kind, item.actor));
      byProposal.set(key, group);
    }
    const { text, html, subject } = digestEmail({
      name: row.author_name,
      siteName: siteName(),
      groups: [...byProposal.values()],
      unsubscribeUrl: new URL("/avisos/baja?t=" + row.unsubscribe_token, base).href,
      settingsUrl: new URL("/cuenta", base).href,
    });
    // One summary per author and day, even if the job runs twice.
    const day = new Date().toISOString().slice(0, 10);
    const digestKey = createHash("sha256").update(row.author_id + ":" + day).digest("hex");
    const result = await sendEmail({
      to: row.author_email,
      from: noticeFrom(),
      subject: `${subject} · ${siteName()}`,
      text,
      html,
      idempotencyKey: `${digestKey.slice(0, 8)}-${digestKey.slice(8, 12)}-4${digestKey.slice(13, 16)}-8${digestKey.slice(17, 20)}-${digestKey.slice(20, 32)}`,
    });
    if (result.ok) {
      // Only what we just reported is marked: anything newer waits for tomorrow.
      await db
        .from("notifications")
        .update({ emailed_at: new Date().toISOString() })
        .in("id", items.map((i) => i.id));
      sent += 1;
    } else {
      skipped += 1;
    }
  }
  return { sent, skipped, authors: rows.length };
}

export async function GET(req: Request) {
  if (!authorised(req)) return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json(await run());
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export const POST = GET;
