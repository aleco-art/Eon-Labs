import { Resend } from "resend";
import { adminDb } from "@/lib/supabase/server";
export async function POST(req: Request) {
  if (!process.env.RESEND_WEBHOOK_SECRET || !process.env.RESEND_API_KEY)
    return new Response("Not configured", { status: 503 });
  try {
    const payload = await req.text();
    const event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    });
    if (event.type === "email.delivered") {
      await adminDb()
        .from("deliveries")
        .update({ status: "delivered", delivered_at: new Date().toISOString() })
        .eq("provider_id", event.data.email_id)
        .in("status", ["accepted", "unknown"]);
    } else if (
      event.type === "email.bounced" ||
      event.type === "email.failed"
    ) {
      await adminDb()
        .from("deliveries")
        .update({
          status: "failed",
          error: "El proveedor informó que el correo no pudo entregarse.",
        })
        .eq("provider_id", event.data.email_id)
        .neq("status", "delivered");
    }
    return Response.json({ received: true });
  } catch {
    return new Response("Invalid webhook", { status: 400 });
  }
}
