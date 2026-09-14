import "server-only";
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, fetch as safeFetch } from "undici";
import robotsParser from "robots-parser";
import * as cheerio from "cheerio";
import { adminDb } from "./supabase/server";
import { normalize } from "./domain";

export type Contact = {
  id: string;
  name: string;
  kind: string;
  email: string | null;
  url: string;
  source_url: string;
  checked_at: string;
  reason: string;
  source_type: string;
};
export const budgets = {
  standard: { queries: 3, pages: 6, seconds: 120, tokens: 0 },
  deep: { queries: 6, pages: 12, seconds: 240, tokens: 0 },
};
const agentName = "IstmoContactResearch";
// Pages are only extracted automatically on Panamanian government domains. Other search hits
// stay as unverified candidates the author must review.
const allowedDomains = ["gob.pa"];
export function isPublicAddress(ip: string) {
  if (isIP(ip) === 6)
    return (
      !/^(::|fc|fd|fe8|fe9|fea|feb|ff)/i.test(ip) && !ip.includes("::ffff:")
    );
  if (isIP(ip) !== 4) return false;
  const [a, b] = ip.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
export async function safeHtml(url: string, maxBytes = 700000) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443")
  )
    throw new Error("URL no permitida");
  const records = await lookup(u.hostname, { all: true });
  if (!records.length || records.some((r) => !isPublicAddress(r.address)))
    throw new Error("Destino no público");
  const ip = records[0];
  const dispatcher = new Agent({
    connect: {
      lookup: (_hostname, _options, callback) =>
        callback(null, ip.address, ip.family),
    },
  });
  try {
    const response = await safeFetch(u, {
      dispatcher,
      redirect: "manual",
      signal: AbortSignal.timeout(6500),
      headers: { "User-Agent": agentName, Accept: "text/html,text/plain" },
    });
    if (response.status !== 200) throw new Error("Página no disponible");
    if (Number(response.headers.get("content-length") ?? 0) > maxBytes)
      throw new Error("Página demasiado grande");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Sin contenido");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Página demasiado grande");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    await dispatcher.close();
  }
}
async function extract(url: string) {
  const u = new URL(url);
  if (
    !allowedDomains.some(
      (d) => u.hostname === d || u.hostname.endsWith("." + d),
    )
  )
    return null;
  let rules: string;
  try {
    rules = await safeHtml(u.origin + "/robots.txt", 100000);
  } catch {
    return null;
  }
  const parser = robotsParser(u.origin + "/robots.txt", rules);
  if (
    parser.isAllowed(url, agentName) === false ||
    (parser.getCrawlDelay(agentName) ?? 0) > 1
  )
    return null;
  const html = await safeHtml(url);
  const $ = cheerio.load(html);
  $("script,style,nav,footer,header,noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").slice(0, 14000);
  const emails = $('a[href^="mailto:"]')
    .map((_i, a) => $(a).attr("href")!.slice(7).split("?")[0])
    .get()
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  return {
    text,
    email:
      emails.find((e) => !/(ejemplo|example|nombre|apellido)/i.test(e)) ?? null,
  };
}
type Metrics = {
  queries?: number;
  pages?: number;
  elapsed_ms?: number;
  cache_hits?: number;
  tokens?: number;
  started_at?: number;
  provider_failures?: number;
};
export async function researchStep(id: string) {
  const db = adminDb();
  const { data: job } = await db
    .from("research_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  if (!job) return null;
  const start = Date.now();
  const metrics: Metrics = job.metrics ?? {};
  const queries = metrics.queries ?? 0;
  const budget = budgets[job.depth as keyof typeof budgets];
  let results: Contact[] = job.results ?? [];
  let status = "partial";
  let error: string | null = null;
  try {
    const { data: p } = await db
      .from("proposals")
      .select("title,body,category,province,district,hidden")
      .eq("id", job.proposal_id)
      .single();
    if (!p || p.hidden) throw new Error("La propuesta ya no está disponible.");
    if (!process.env.TAVILY_API_KEY)
      throw new Error(
        "La búsqueda web requiere configuración. Se muestran los contactos del directorio.",
      );
    const { data: t } = await db
      .from("territories")
      .select("province,district")
      .eq(p.district ? "district_code" : "province_code", p.district ?? p.province ?? "")
      .limit(1)
      .maybeSingle();
    const place = p.district ? t?.district : p.province ? t?.province : "Panamá";
    // Cache uses public proposal context, never user identity or private correspondence.
    const key = createHash("sha256")
      .update(
        normalize(
          [p.title, p.body.slice(0, 500), p.category, place, queries].join("|"),
        ),
      )
      .digest("hex");
    const { data: cache } = await db
      .from("research_cache")
      .select("results")
      .eq("key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    let found: Contact[] = [];
    if (cache) {
      found = cache.results;
      metrics.cache_hits = (metrics.cache_hits ?? 0) + 1;
    } else {
      const focus = [
        "contacto organización",
        "directorio profesional contacto",
        "institución competencia formulario",
        "asociación empresa contacto",
        "productor organizador contacto",
        "portal propuestas contacto",
      ][queries];
      const q = `Panamá ${place ?? ""} ${p.category} ${p.title.slice(0, 100)} ${focus}`;
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query: q,
          search_depth: "basic",
          max_results: 3,
          include_raw_content: false,
          include_answer: false,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw new Error(
          "El proveedor de búsqueda no respondió. Los resultados guardados siguen disponibles.",
        );
      const payload = await response.json();
      let extracted = 0;
      for (const hit of (payload.results ?? []).slice(0, 3)) {
        const url = String(hit.url ?? "");
        let u: URL;
        try {
          u = new URL(url);
          if (u.protocol !== "https:" || u.username || u.password) continue;
        } catch {
          continue;
        }
        let page: null | { text: string; email: string | null } = null;
        if (extracted < 2) {
          try {
            page = await extract(url);
          } catch {
            /* Failed pages stay unverified. */
          }
          extracted++;
          metrics.pages = (metrics.pages ?? 0) + 1;
        }
        const title = String(hit.title ?? u.hostname).slice(0, 140);
        found.push({
          id: createHash("sha256").update(url).digest("hex").slice(0, 24),
          name: title,
          kind: "Resultado web · revisar",
          email: page?.email ?? null,
          url,
          source_url: url,
          checked_at: new Date().toISOString().slice(0, 10),
          reason: page
            ? "Página consultada. Revisa la competencia y jurisdicción de la organización antes de enviar."
            : "Resultado de búsqueda pendiente de corroboración. Visita la fuente para comprobar pertinencia y contacto.",
          source_type: page
            ? "Página pública consultada"
            : "Resultado web no verificado",
        });
      }
      await db
        .from("research_cache")
        .upsert({
          key,
          results: found,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        });
    }
    results = [
      ...new Map([...results, ...found].map((c) => [c.url, c])).values(),
    ].slice(0, 18);
    metrics.queries = queries + 1;
    metrics.tokens = 0;
    metrics.elapsed_ms = (metrics.elapsed_ms ?? 0) + Date.now() - start;
    const enough =
      results.filter(
        (c) =>
          c.source_type === "Sitio oficial" ||
          c.source_type === "Sitio de la organización",
      ).length >= 3;
    status = enough
      ? "complete"
      : metrics.queries >= budget.queries ||
          (metrics.elapsed_ms ?? 0) > budget.seconds * 1000
        ? "partial"
        : "queued";
  } catch (e) {
    error = e instanceof Error ? e.message : "Error de investigación";
    metrics.provider_failures = (metrics.provider_failures ?? 0) + 1;
    metrics.elapsed_ms = (metrics.elapsed_ms ?? 0) + Date.now() - start;
    status = results.length ? "partial" : "failed";
  }
  // A cancellation wins over a late worker response.
  await db
    .from("research_jobs")
    .update({
      status,
      results,
      metrics,
      error,
      progress:
        status === "queued"
          ? Math.round(((metrics.queries ?? 0) / budget.queries) * 100)
          : 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "running");
  return status;
}

/** Runs query steps server-side until the job completes, is cancelled or exhausts its budget. */
export async function runResearch(id: string) {
  const started = Date.now();
  for (let step = 0; step < budgets.deep.queries; step++) {
    const status = await researchStep(id);
    if (status !== "queued" || Date.now() - started > 240_000) return;
  }
}
