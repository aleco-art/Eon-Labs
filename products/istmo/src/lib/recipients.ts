import "server-only";
import { normalize } from "./domain";

export type Responsable = {
  id: string;
  name: string;
  entity_type: string;
  role_title: string | null;
  person_name: string | null;
  areas: string[];
  level: "nacional" | "provincial" | "distrital";
  province_code: string | null;
  district_code: string | null;
  email: string | null;
  generic_domain: boolean;
  contact_url: string | null;
  phone: string | null;
  competence: string;
  source_url: string;
  source_title: string | null;
  source_kind: "oficial" | "otra_publica";
  checked_at: string;
  status: string;
  notes: string | null;
};
export type Suggestion = Responsable & { score: number; reason: string; jurisdiction: string };

type ProposalContext = {
  title: string;
  body: string;
  category: string;
  province: string | null;
  district: string | null;
};
type Place = { province?: string; district?: string };

const STOP = new Set(["para", "como", "con", "del", "las", "los", "una", "por", "que", "sus", "este", "esta", "más", "entre", "sobre", "desde"]);

/**
 * Ranks directory entries by competence (thematic area), jurisdiction and channel quality.
 * Entries outside the proposal's territory are excluded, not just ranked lower: a mayor's
 * office in another district has no competence over the proposal.
 */
export function rankResponsables(p: ProposalContext, all: Responsable[], place: Place, limit = 6): Suggestion[] {
  const words = new Set(
    normalize(p.title + " " + p.body).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 4 && !STOP.has(w)),
  );
  const scored: Suggestion[] = [];
  for (const r of all) {
    if (r.status === "inactivo") continue;
    const areaIndex = r.areas.indexOf(p.category);
    if (areaIndex < 0) continue;
    let score = 0;
    let jurisdiction: string;
    if (r.level === "distrital") {
      if (!p.district || r.district_code !== p.district) continue;
      score += 45;
      jurisdiction = `Jurisdicción en el distrito de ${place.district ?? "la propuesta"}`;
    } else if (r.level === "provincial") {
      if (!p.province || r.province_code !== p.province) continue;
      score += 30;
      jurisdiction = `Alcance en ${place.province ?? "la provincia de la propuesta"}`;
    } else {
      score += p.province ? 18 : 30;
      jurisdiction = "Alcance nacional";
    }
    score += areaIndex === 0 ? 12 : 6;
    score += Math.max(0, 8 - r.areas.length);
    if (r.email) score += 25;
    else if (r.contact_url) score += 5;
    if (r.source_kind === "oficial") score += 10;
    if (r.generic_domain) score -= 4;
    if (r.status === "revisar") score -= 10;
    const competenceWords = normalize(r.competence + " " + (r.role_title ?? "")).split(/[^a-z0-9ñ]+/);
    const overlap = competenceWords.filter((w) => words.has(w)).length;
    score += Math.min(overlap * 3, 12);
    const reason = `${r.competence} Relación con la temática «${p.category}». ${jurisdiction}.`;
    scored.push({ ...r, score, reason, jurisdiction });
  }
  return scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
}
