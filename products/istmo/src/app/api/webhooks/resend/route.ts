import { Resend } from "resend";
import { adminDb } from "@/lib/supabase/server";

// Delivery confirmations from Resend (signed with Svix). "Delivered" means the recipient's
// mail server accepted the message; it says nothing about the message being read or answered.
export async function POST(req: Request) {
  if (!process.env.RESEND_WEBHOOK_SECRET || !process.env.RESEND_API_KEY)
    return new Response("Not configured", { status: 503 });
  let event;
  try {
    const payload = await req.text();
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    });
  } catch {
    return new Response("Invalid webhook", { status: 400 });
  }
  const emailId = (event.data as { email_id?: string }).email_id;
  if (!emailId) return Response.json({ received: true });
  const db = adminDb();
  const now = new Date().toISOString();
  if (event.type === "email.delivered") {
    await db
      .from("deliveries")
      .update({ status: "delivered", delivered_at: now, updated_at: now })
      .eq("provider_id", emailId)
      .in("status", ["pending", "accepted", "unknown"]);
  } else if (event.type === "email.bounced") {
    await db
      .from("deliveries")
      .update({ status: "bounced", error: "El servidor del destinatario rechazó el correo (rebote).", updated_at: now })
      .eq("provider_id", emailId);
  } else if (event.type === "email.failed") {
    await db
      .from("deliveries")
      .update({ status: "failed", error: "El proveedor informó que no pudo enviar el correo.", updated_at: now })
      .eq("provider_id", emailId)
      .neq("status", "delivered");
  }
  return Response.json({ received: true });
}
