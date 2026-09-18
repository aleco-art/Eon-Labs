import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { proposalSelect, type Proposal } from "./domain";
import { placeName } from "./place";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Anonymous reader: a share card never shows more than a visitor could see. */
function publicDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type ShareData = { proposal: Proposal; place: string };

/** The proposal as it appears in link previews. Memoised so metadata and image share one query. */
export const shareData = cache(async (id: string): Promise<ShareData | null> => {
  const db = publicDb();
  if (!db || !uuid.test(id)) return null;
  const { data } = await db.from("proposals").select(proposalSelect).eq("id", id).eq("hidden", false).maybeSingle();
  if (!data) return null;
  const proposal = data as unknown as Proposal;
  return { proposal, place: await placeName(db, proposal) };
});

// The image renderer reads PNG and JPEG; a WebP cover is skipped rather than shown broken.
const readable = new Set(["image/png", "image/jpeg"]);

/** First photo of the proposal as a data URL, or null when there is none it can draw. */
export async function sharePhoto(id: string): Promise<string | null> {
  const db = publicDb();
  if (!db || !uuid.test(id)) return null;
  const { data: photos } = await db
    .from("attachments")
    .select("path,mime")
    .eq("proposal_id", id)
    .eq("kind", "foto")
    .eq("hidden", false)
    .order("created_at")
    .limit(3);
  const photo = (photos ?? []).find((p) => readable.has(p.mime));
  if (!photo) return null;
  const { data: file } = await db.storage.from("proposal-files").download(photo.path);
  if (!file) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${photo.mime};base64,${bytes.toString("base64")}`;
}

/** First sentences of the body, cut on a word, for the preview text. */
export function excerpt(body: string, max = 180) {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, flat.lastIndexOf(" ", max)) + "…";
}
