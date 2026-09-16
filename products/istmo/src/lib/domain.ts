export const categories = [
  "Gubernamental",
  "Urbanización",
  "Eventos",
  "Turismo",
  "Cultura",
  "Gastronomía",
  "Medioambiente",
  "Deportes",
  "Emprendimiento",
  "Otras",
] as const;
export type Category = (typeof categories)[number];

export type Profile = {
  id: string;
  name: string;
  bio: string;
  location: string;
  avatar_path: string | null;
  occupation: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
};

export const profileSelect = "id,name,bio,location,avatar_path,occupation,contact_email,phone,website,instagram,linkedin";

export type Proposal = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  category: Category;
  province: string | null;
  district: string | null;
  corregimiento: string | null;
  created_at: string;
  updated_at: string;
  shared_at: string | null;
  like_count: number;
  reshare_count: number;
  comment_count: number;
  signatures_enabled: boolean;
  signature_goal: number | null;
  signature_count: number;
  profiles: Pick<Profile, "id" | "name" | "avatar_path"> | null;
};

export const proposalSelect =
  "id,author_id,title,body,category,province,district,corregimiento,created_at,updated_at,shared_at,like_count,reshare_count,comment_count,signatures_enabled,signature_goal,signature_count,profiles!proposals_author_id_fkey(id,name,avatar_path)";

export const photoLimit = 6;
export const documentLimit = 5;
/** Inline URL for a photo; documents use the same route without `inline` to download. */
export const photoUrl = (attachmentId: string) => `/api/archivo/${attachmentId}?inline=1`;

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const dateLabel = (s: string) =>
  new Date(s).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });

export const deliveryLabels: Record<string, string> = {
  pending: "En proceso",
  accepted: "Aceptado por el proveedor de correo",
  delivered: "Entregado al servidor del destinatario",
  bounced: "Rebotado por el destinatario",
  failed: "Envío fallido",
  unknown: "Resultado por confirmar",
  skipped: "No enviado",
};

export type NotificationKind = "apoyo" | "firma" | "comentario" | "republicacion" | "meta_firmas";
export type Notification = {
  id: string;
  kind: NotificationKind;
  actor_name: string | null;
  proposal_id: string | null;
  comment_id: string | null;
  created_at: string;
  read_at: string | null;
  proposals: { title: string } | null;
};
export const notificationSelect = "id,kind,actor_name,proposal_id,comment_id,created_at,read_at,proposals(title)";

/** What happened, in one line. `who` is the person's name, or nobody for anonymous signatures. */
export function notificationLine(kind: NotificationKind, who: string | null) {
  const name = who ?? "Alguien";
  switch (kind) {
    case "apoyo":
      return `${name} apoyó tu propuesta`;
    case "firma":
      return `${name} firmó tu propuesta`;
    case "comentario":
      return `${name} comentó tu propuesta`;
    case "republicacion":
      return `${name} republicó tu propuesta`;
    case "meta_firmas":
      return "Tu propuesta alcanzó su meta de firmas";
  }
}
