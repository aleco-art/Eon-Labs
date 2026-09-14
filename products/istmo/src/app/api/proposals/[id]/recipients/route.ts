import { z } from "zod";
import { apiError, checkOrigin, requireUser } from "@/lib/api";
import { emailMode } from "@/lib/email";
import { rankResponsables, type Responsable } from "@/lib/recipients";

type Params = { params: Promise<{ id: string }> };

async function ownProposal(id: string) {
  const { db, user } = await requireUser();
  const { data: proposal } = await db
    .from("proposals")
    .select("id,title,body,category,province,district,corregimiento,hidden")
    .eq("id", z.uuid().parse(id))
    .eq("author_id", user.id)
    .maybeSingle();
  if (!proposal) throw new Error("Solo el autor puede gestionar los destinatarios de esta propuesta.");
  return { db, user, proposal };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { db, proposal } = await ownProposal((await params).id);
    const [directory, saved, deliveries, place] = await Promise.all([
      db.from("responsables").select("*").contains("areas", [proposal.category]),
      db.from("proposal_recipients").select("*").eq("proposal_id", proposal.id).order("created_at"),
      db
        .from("deliveries")
        .select("id,recipient,recipient_name,status,error,created_at,accepted_at,delivered_at,provider")
        .eq("proposal_id", proposal.id)
        .order("created_at", { ascending: false }),
      proposal.district
        ? db.from("territories").select("province,district").eq("district_code", proposal.district).limit(1).maybeSingle()
        : proposal.province
          ? db.from("territories").select("province").eq("province_code", proposal.province).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
    ]);
    if (directory.error || saved.error || deliveries.error) throw new Error("No se pudo cargar el directorio.");
    const suggestions = rankResponsables(proposal, (directory.data ?? []) as Responsable[], place.data ?? {});
    const mode = emailMode();
    return Response.json(
      {
        suggestions,
        saved: saved.data,
        deliveries: deliveries.data,
        email: mode.configured
          ? { configured: true, sandbox: mode.sandbox, provider: mode.provider }
          : { configured: false, reason: mode.reason },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}

const addSchema = z.union([
  z.object({ responsableId: z.string().min(1).max(80) }),
  z.object({
    manual: z
      .object({
        name: z.string().trim().min(2).max(160),
        role_title: z.string().trim().max(160).optional(),
        email: z.email().max(254).optional().or(z.literal("")),
        contact_url: z.url().startsWith("https://").max(500).optional().or(z.literal("")),
      })
      .refine((m) => m.email || m.contact_url, "Añade un correo profesional o un enlace HTTPS de contacto."),
  }),
]);

export async function POST(req: Request, { params }: Params) {
  try {
    checkOrigin(req);
    const { db, user, proposal } = await ownProposal((await params).id);
    const input = addSchema.parse(await req.json());
    let row;
    if ("responsableId" in input) {
      // Copy the reviewed directory entry server-side; clients cannot alter its email or source.
      const { data: r } = await db.from("responsables").select("*").eq("id", input.responsableId).maybeSingle();
      if (!r) throw new Error("Ese responsable ya no está disponible.");
      row = {
        proposal_id: proposal.id,
        author_id: user.id,
        responsable_id: r.id,
        name: r.name,
        role_title: [r.role_title, r.person_name].filter(Boolean).join(" · ") || null,
        email: r.email,
        contact_url: r.contact_url ?? (r.email ? null : r.source_url),
        reason: r.competence,
        source_url: r.source_url,
        source_kind: r.source_kind,
        checked_at: r.checked_at,
      };
    } else {
      row = {
        proposal_id: proposal.id,
        author_id: user.id,
        name: input.manual.name,
        role_title: input.manual.role_title || null,
        email: input.manual.email ? input.manual.email.toLowerCase() : null,
        contact_url: input.manual.contact_url || null,
        reason: "Añadido por el autor. La plataforma no ha verificado este contacto.",
        source_url: input.manual.contact_url || null,
        source_kind: "manual",
        checked_at: null,
      };
    }
    const { data, error } = await db.from("proposal_recipients").insert(row).select("*").single();
    if (error)
      throw new Error(
        error.code === "23505" ? "Ese correo ya está en tu lista de destinatarios." : error.code === "P0001" ? error.message : "No se pudo añadir el destinatario.",
      );
    return Response.json(data);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    checkOrigin(req);
    const { db, proposal } = await ownProposal((await params).id);
    const recipientId = z.uuid().parse(new URL(req.url).searchParams.get("recipientId"));
    const { error } = await db.from("proposal_recipients").delete().eq("id", recipientId).eq("proposal_id", proposal.id);
    if (error) throw new Error("No se pudo quitar el destinatario.");
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
