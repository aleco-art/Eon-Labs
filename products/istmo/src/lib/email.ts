import "server-only";
import { Resend } from "resend";
import nodemailer from "nodemailer";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  idempotencyKey: string;
};
export type EmailResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string; uncertain: boolean };

type Mode =
  | { configured: false; reason: string }
  | { configured: true; provider: "resend" | "smtp"; sandbox: boolean; redirectTo: string | null; from: string };

const isProduction = () =>
  process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";

/**
 * Decides how proposals are emailed. Outside production nothing reaches a real third party:
 * SMTP targets a local capture inbox (Mailpit) and Resend requires EMAIL_TEST_RECIPIENT,
 * which receives every message instead of the real recipient.
 */
export function emailMode(): Mode {
  const from = process.env.EMAIL_FROM;
  const provider = process.env.EMAIL_PROVIDER;
  if (!from) return { configured: false, reason: "Falta configurar el remitente verificado (EMAIL_FROM)." };
  if (provider === "smtp") {
    if (isProduction()) return { configured: false, reason: "El modo SMTP de prueba no está permitido en producción." };
    if (!process.env.SMTP_HOST) return { configured: false, reason: "Falta SMTP_HOST para el buzón de pruebas." };
    return { configured: true, provider: "smtp", sandbox: true, redirectTo: null, from };
  }
  if (provider === "resend") {
    if (!process.env.RESEND_API_KEY) return { configured: false, reason: "Falta la clave del proveedor de correo (RESEND_API_KEY)." };
    if (isProduction()) return { configured: true, provider: "resend", sandbox: false, redirectTo: null, from };
    const redirect = process.env.EMAIL_TEST_RECIPIENT;
    if (!redirect) return { configured: false, reason: "Fuera de producción, define EMAIL_TEST_RECIPIENT para no escribir a terceros." };
    return { configured: true, provider: "resend", sandbox: true, redirectTo: redirect, from };
  }
  return { configured: false, reason: "El envío de correo no está configurado (EMAIL_PROVIDER)." };
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const mode = emailMode();
  if (!mode.configured) return { ok: false, error: mode.reason, uncertain: false };
  const to = mode.redirectTo ?? message.to;
  const subject = mode.redirectTo ? `[Prueba para ${message.to}] ${message.subject}` : message.subject;
  if (mode.provider === "smtp") {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 1025),
        secure: false,
      });
      const info = await transport.sendMail({
        from: mode.from, to, subject, text: message.text, html: message.html,
        replyTo: message.replyTo,
        headers: { "X-Istmo-Idempotency-Key": message.idempotencyKey },
      });
      return { ok: true, providerId: "smtp:" + info.messageId };
    } catch {
      return { ok: false, error: "El servidor de correo de pruebas rechazó el mensaje.", uncertain: false };
    }
  }
  try {
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send(
      { from: mode.from, to: [to], subject, text: message.text, html: message.html, ...(message.replyTo ? { replyTo: message.replyTo } : {}) },
      { idempotencyKey: message.idempotencyKey },
    );
    if (error) return { ok: false, error: "El proveedor de correo rechazó el envío.", uncertain: false };
    if (!data?.id) return { ok: false, error: "El proveedor no confirmó el resultado.", uncertain: true };
    return { ok: true, providerId: data.id };
  } catch {
    // Network errors leave the outcome unknown: the provider may have accepted the message.
    return { ok: false, error: "No se pudo confirmar el resultado con el proveedor.", uncertain: true };
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function proposalEmail(input: {
  recipientName: string;
  authorName: string;
  subject: string;
  message: string;
  proposalUrl: string;
  files: { name: string; url: string }[];
  replyToAuthor: boolean;
  siteName: string;
}) {
  const disclaimer = `${input.siteName} es una plataforma ciudadana independiente. No representa a ninguna entidad, no aprueba propuestas ni garantiza su ejecución. Este mensaje lo envió ${input.authorName}, autor de la propuesta, tras revisarlo y confirmarlo.`;
  const reply = input.replyToAuthor
    ? `Si responde a este correo, su respuesta llegará directamente a ${input.authorName}.`
    : `${input.authorName} no compartió su correo. Puede comentar la propuesta en su página pública.`;
  const files = input.files.length
    ? "\n\nArchivos de apoyo:\n" + input.files.map((f) => `- ${f.name}: ${f.url}`).join("\n")
    : "";
  const text = `${input.message}\n\nPropuesta pública: ${input.proposalUrl}${files}\n\n${reply}\n\n—\n${disclaimer}`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#10213f">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="height:6px;background:linear-gradient(90deg,#0a3a82 0 50%,#d21034 50% 100%);border-radius:6px 6px 0 0"></div>
<div style="background:#fff;border:1px solid #dbe2ee;border-top:0;border-radius:0 0 12px 12px;padding:28px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;color:#d21034;font-weight:bold">PROPUESTA CIUDADANA</p>
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#0a3a82">${escape(input.subject)}</h1>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.6">${escape(input.message)}</div>
<p style="margin:24px 0"><a href="${escape(input.proposalUrl)}" style="display:inline-block;background:#0a3a82;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Ver la propuesta pública</a></p>
${input.files.length ? `<p style="margin:0 0 6px;font-weight:bold">Archivos de apoyo</p><ul style="margin:0 0 18px;padding-left:18px">${input.files.map((f) => `<li><a href="${escape(f.url)}" style="color:#0a3a82">${escape(f.name)}</a></li>`).join("")}</ul>` : ""}
<p style="font-size:14px;color:#3b4a66">${escape(reply)}</p>
<hr style="border:0;border-top:1px solid #dbe2ee;margin:20px 0">
<p style="font-size:12px;color:#5b6780;line-height:1.5">${escape(disclaimer)}</p>
</div></div></body></html>`;
  return { text, html };
}
