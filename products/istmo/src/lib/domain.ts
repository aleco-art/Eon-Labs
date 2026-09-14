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
  profiles: Profile;
  likes: { user_id: string }[];
  reshares: { user_id: string }[];
  comments: { id: string }[];
  shared_at: string | null;
};
export type Contact = {
  id: string;
  name: string;
  kind: string;
  categories: string[];
  province: string | null;
  district: string | null;
  email: string | null;
  url: string;
  source_url: string;
  checked_at: string;
  reason: string;
  source_type: string;
};
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const dateLabel = (s: string) =>
  new Date(s).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
