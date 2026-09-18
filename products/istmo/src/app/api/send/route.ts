import { createHash } from "node:crypto";
import { z } from "zod";
import { apiError, checkOrigin, requireUser, limit } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";
import { emailMode, proposalEmail, sendEmail } from "@/lib/email";
import { siteName } from "@/lib/site";
import { placeName } from "@/lib/place";

export const maxDuration = 60;

const schema = z.object({
  proposalId: z.uuid(),
  recipientIds: z.array(z.uuid()).min(1).max(10),
  subject: z.string().trim().min(3).max(200).refine((s) => !/[\r\n]/.test(s), "El asunto no puede tener saltos de línea."),
  message: z.string().trim().min(20).max(15000),
  attachmentIds: z.array(z.uuid()).max(5),
  replyToAuthor: z.boolean(),
  confirmed: z.literal(true),
  batchKey: z.uuid(),
});

// Deterministic per-recipient key: retrying the same confirmed batch never sends twice.
const keyFor = (batch: string, recipient: string) => {
  const h = createHash("sha256").update(batch + ":" + recipient).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const RESEND_WINDOW_DAYS = 30;

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { db, user } = await requireUser();
    const input = schema.parse(await req.json());
    const mode = emailMode();
    if (!mode.configured)
      return Response.json({ error: mode.reason + " No se ha enviado ningún mensaje." }, { status: 503 });
    const base = process.env.NEXT_PUBLIC_SITE_URL;
    if (!base) throw new Error("Falta la dirección pública del sitio (NEXT_PUBLIC_SITE_URL).");

    const { data: proposal } = await db
      .from("proposals")
      .select("id,title,body,category,province,district,corregimiento,shared_at,like_count,comment_count,reshare_count,signature_count,signature_goal,signatures_enabled,profiles!proposals_author_id_fkey(name)")
      .eq("id", input.proposalId)
      .eq("author_id", user.id)
      .eq("hidden", false)
      .maybeSingle();
    if (!proposal) throw new Error("Solo el autor puede enviar esta propuesta.");

    const [{ data: recipients }, { data: files }] = await Promise.all([
      db.from("proposal_recipients").select("id,name,email").eq("proposal_id", proposal.id).in("id", input.recipientIds),
      input.attachmentIds.length
        ? db.from("attachments").select("id,name").eq("proposal_id", proposal.id).eq("hidden", false).in("id", input.attachmentIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);
    if ((recipients?.length ?? 0) !== input.recipientIds.length) throw new Error("Algún destinatario ya no está en tu lista.");
    if ((files?.length ?? 0) !== input.attachmentIds.length) throw new Error("Algún archivo no está disponible.");

    const admin = adminDb();
    const place = await placeName(admin, proposal);
    const authorName = (proposal.profiles as unknown as { name: string } | null)?.name ?? "Autor de la propuesta";
    const proposalUrl = new URL("/propuesta/" + proposal.id, base).href;
    const { text, html } = proposalEmail({
      recipientName: "",
      authorName,
      subject: input.subject,
      message: input.message,
      proposalUrl,
      files: (files ?? []).map((f) => ({ name: f.name, url: new URL("/api/archivo/" + f.id, base).href })),
      replyToAuthor: input.replyToAuthor,
      siteName: siteName(),
      proposal: { title: proposal.title, body: proposal.body, category: proposal.category, place },
      support: {
        signatures: proposal.signature_count,
        signatureGoal: proposal.signature_goal,
        signaturesEnabled: proposal.signatures_enabled,
        likes: proposal.like_count,
        comments: proposal.comment_count,
        reshares: proposal.reshare_count,
      },
    });

    const results: { recipientId: string; name: string; status: string; message: string }[] = [];
    for (const r of recipients!) {
      if (!r.email) {
        results.push({ recipientId: r.id, name: r.name, status: "skipped", message: "No tiene correo publicado. Usa su portal de contacto." });
        continue;
      }
      const idempotencyKey = keyFor(input.batchKey, r.id);
      const { data: existing } = await admin.from("deliveries").select("id,status").eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existing) {
        results.push({ recipientId: r.id, name: r.name, status: existing.status, message: "Este envío ya estaba registrado." });
        continue;
      }
      const since = new Date(Date.now() - RESEND_WINDOW_DAYS * 86400000).toISOString();
      const { count } = await admin
        .from("deliveries")
        .select("id", { count: "exact", head: true })
        .eq("proposal_id", proposal.id)
        .eq("recipient", r.email.toLowerCase())
        .in("status", ["pending", "accepted", "delivered", "unknown"])
        .gte("created_at", since);
      if (count) {
        results.push({ recipientId: r.id, name: r.name, status: "skipped", message: `Ya se envió a este destinatario en los últimos ${RESEND_WINDOW_DAYS} días.` });
        continue;
      }
      try {
        await limit(user.id, "email", 20);
      } catch (e) {
        results.push({ recipientId: r.id, name: r.name, status: "skipped", message: e instanceof Error ? e.message : "Límite alcanzado." });
        break;
      }
      const { data: delivery, error: insertError } = await admin
        .from("deliveries")
        .insert({
          proposal_id: proposal.id,
          user_id: user.id,
          recipient_id: r.id,
          recipient: r.email,
          recipient_name: r.name,
          subject: input.subject,
          body: input.message,
          reply_to: input.replyToAuthor ? user.email : null,
          attachment_ids: input.attachmentIds,
          provider: mode.provider + (mode.sandbox ? ":prueba" : ""),
          idempotency_key: idempotencyKey,
        })
        .select("id")
        .single();
      if (insertError) {
        results.push({ recipientId: r.id, name: r.name, status: "failed", message: "No se pudo registrar el envío; no se envió." });
        continue;
      }
      const sent = await sendEmail({
        to: r.email,
        subject: input.subject,
        text,
        html,
        replyTo: input.replyToAuthor && user.email ? user.email : undefined,
        cc: input.replyToAuthor && user.email ? user.email : undefined,
        idempotencyKey,
      });
      const now = new Date().toISOString();
      if (sent.ok) {
        await admin.from("deliveries").update({ status: "accepted", provider_id: sent.providerId, accepted_at: now, updated_at: now }).eq("id", delivery.id);
        results.push({ recipientId: r.id, name: r.name, status: "accepted", message: "Aceptado por el proveedor de correo." });
      } else {
        const status = sent.uncertain ? "unknown" : "failed";
        await admin.from("deliveries").update({ status, error: sent.error, updated_at: now }).eq("id", delivery.id);
        results.push({ recipientId: r.id, name: r.name, status, message: sent.error });
      }
    }
    if (!proposal.shared_at && results.some((r) => r.status === "accepted")) {
      await admin.from("proposals").update({ shared_at: new Date().toISOString() }).eq("id", proposal.id);
    }
    return Response.json({ results, sandbox: mode.sandbox });
  } catch (e) {
    return apiError(e);
  }
}
