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
};

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
  profiles: Pick<Profile, "id" | "name" | "avatar_path"> | null;
};

export const proposalSelect =
  "id,author_id,title,body,category,province,district,corregimiento,created_at,updated_at,shared_at,like_count,reshare_count,comment_count,profiles!proposals_author_id_fkey(id,name,avatar_path)";

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
