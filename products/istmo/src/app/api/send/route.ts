import { z } from "zod";
import { Resend } from "resend";
import { apiError, checkOrigin, requireUser, limit } from "@/lib/api";
import { adminDb } from "@/lib/supabase/server";
const schema = z.object({
  proposalId: z.uuid(),
  recipient: z.email().max(254),
  subject: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .refine((s) => !/[\r\n]/.test(s)),
  body: z.string().trim().min(20).max(15000),
  attachmentIds: z.array(z.uuid()).max(5),
  replyToAuthor: z.boolean(),
  confirmed: z.literal(true),
  idempotencyKey: z.uuid(),
});
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { db, user } = await requireUser();
    const input = schema.parse(await req.json());
    if (
      !process.env.RESEND_API_KEY ||
      !process.env.RESEND_FROM ||
      !process.env.NEXT_PUBLIC_SITE_URL
    )
      throw new Error(
        "El envío de correo requiere configuración. No se ha enviado ningún mensaje.",
      );
    const { data: p } = await db
      .from("proposals")
      .select("id")
      .eq("id", input.proposalId)
      .eq("author_id", user.id)
      .eq("hidden", false)
      .single();
    if (!p) throw new Error("Solo el autor puede enviar esta propuesta.");
    const admin = adminDb();
    const { data: previous } = await admin
      .from("deliveries")
      .select("id,status,recipient,subject,body,proposal_id")
      .eq("idempotency_key", input.idempotencyKey)
      .eq("user_id", user.id)
      .maybeSingle();
    if (previous) {
      if (
        previous.recipient !== input.recipient ||
        previous.subject !== input.subject ||
        previous.body !== input.body ||
        previous.proposal_id !== p.id
      )
        throw new Error(
          "El mensaje cambió. Abre una nueva revisión antes de enviarlo.",
        );
      return Response.json(previous);
    }
    await limit(user.id, "email", 5);
    const { count } = await admin
      .from("deliveries")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", p.id)
      .eq("recipient", input.recipient)
      .in("status", ["pending", "accepted", "delivered", "unknown"])
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if (count)
      throw new Error(
        "Ya hay un envío reciente o pendiente para este destinatario.",
      );
    const { data: attachments } = await db
      .from("attachments")
      .select("id,name")
      .eq("proposal_id", p.id)
      .in("id", input.attachmentIds);
    if ((attachments?.length ?? 0) !== input.attachmentIds.length)
      throw new Error("Algún archivo no está disponible.");
    const base = new URL(process.env.NEXT_PUBLIC_SITE_URL);
    if (process.env.NODE_ENV === "production" && base.protocol !== "https:")
      throw new Error("El sitio requiere una dirección pública HTTPS.");
    const text =
      input.body +
      "\n\nPropuesta pública: " +
      new URL("/propuesta/" + p.id, base).href +
      (attachments?.length
        ? "\n\nArchivos compartidos:\n" +
          attachments
            .map(
              (a) => a.name + ": " + new URL("/api/archivo/" + a.id, base).href,
            )
            .join("\n")
        : "") +
      "\n\nEnviado por su autor a través de Istmo. La plataforma no representa al destinatario ni aprueba la propuesta.";
    const { data: delivery, error: insertError } = await admin
      .from("deliveries")
      .insert({
        proposal_id: p.id,
        user_id: user.id,
        recipient: input.recipient,
        subject: input.subject,
        body: input.body,
        idempotency_key: input.idempotencyKey,
      })
      .select("id")
      .single();
    if (insertError)
      throw new Error(
        "No se pudo registrar el envío. No se ha enviado el mensaje.",
      );
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send(
        {
          from: process.env.RESEND_FROM,
          to: [input.recipient],
          subject: input.subject,
          text,
          ...(input.replyToAuthor && user.email ? { replyTo: user.email } : {}),
        },
        { idempotencyKey: input.idempotencyKey },
      );
      if (error) {
        await admin
          .from("deliveries")
          .update({ status: "failed", error: "El proveedor rechazó el envío." })
          .eq("id", delivery.id);
        throw new Error("El proveedor rechazó el envío.");
      }
      if (!data?.id) throw new Error("El proveedor no confirmó el resultado.");
      const { error: saveError } = await admin
        .from("deliveries")
        .update({ status: "accepted", provider_id: data.id })
        .eq("id", delivery.id);
      if (saveError)
        throw new Error(
          "El proveedor aceptó el correo, pero el registro requiere conciliación.",
        );
      await admin
        .from("proposals")
        .update({ shared_at: new Date().toISOString() })
        .eq("id", p.id);
      return Response.json({ id: delivery.id, status: "accepted" });
    } catch (e) {
      await admin
        .from("deliveries")
        .update({
          status: "unknown",
          error:
            "Resultado incierto; revisar en el proveedor antes de repetir.",
        })
        .eq("id", delivery.id)
        .eq("status", "pending");
      throw e;
    }
  } catch (e) {
    return apiError(e);
  }
}
