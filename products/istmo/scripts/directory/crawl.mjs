// Directory crawler: finds published contact channels on organisations' own sites.
// Polite by design: robots.txt, one request at a time per domain, timeouts, capped retries.
// Output is raw evidence for human review, never imported directly.
import fs from "node:fs/promises";
import robotsParser from "robots-parser";
import * as cheerio from "cheerio";

const UA = "IstmoDirectoryBot/1.0 (+https://istmoapp.digital/fuentes)";
const seeds = JSON.parse(await fs.readFile(new URL("./seeds.json", import.meta.url), "utf8"));
const only = process.argv[2] ? new Set(process.argv[2].split(",")) : null;
const today = new Date().toISOString().slice(0, 10);
const MAX_PAGES = 6;
const CONTACT_HINT = /contact|cont[aá]ct|atenci[oó]n|directorio|transparencia|servicio.al.cliente|ubicaci[oó]n|oficinas|participaci[oó]n|escr[ií]benos|sugerencia/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JUNK = /(example|ejemplo|domain|sentry|wixpress|\.png|\.jpg|\.webp|\.gif|u003e|@2x|nombre@|usuario@|correo@)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 2) {
  for (let i = 0; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,text/plain" }, redirect: "follow", signal: AbortSignal.timeout(12000) });
      const type = r.headers.get("content-type") ?? "";
      if (!r.ok) return { status: r.status, url: r.url, text: "" };
      if (!/text|html/.test(type)) return { status: r.status, url: r.url, text: "" };
      const text = (await r.text()).slice(0, 1_500_000);
      return { status: r.status, url: r.url, text };
    } catch (e) {
      if (i === tries) return { status: 0, url, text: "", error: e.cause?.code ?? e.name };
      await sleep(800 * 2 ** i);
    }
  }
}

async function crawl(seed) {
  const origin = new URL(seed.site).origin;
  const out = { id: seed.id, site: seed.site, checked_at: today, robots: null, pages: [], emails: {}, forms: [], errors: [] };
  const robotsRes = await get(origin + "/robots.txt", 1);
  const robots = robotsParser(origin + "/robots.txt", robotsRes.status === 200 ? robotsRes.text : "");
  out.robots = robotsRes.status;
  const robotsByOrigin = new Map([[origin, robots]]);
  const delay = Math.min(Math.max((robots.getCrawlDelay(UA) ?? 1) * 1000, 800), 5000);
  const queue = [...(seed.pages ?? []), seed.site];
  const seen = new Set();
  const maxPages = MAX_PAGES + (seed.pages?.length ?? 0);
  while (queue.length && out.pages.length < maxPages) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    // Targeted pages can live on sibling subdomains, which have their own robots.txt.
    const pageOrigin = new URL(url).origin;
    if (!robotsByOrigin.has(pageOrigin)) {
      const rr = await get(pageOrigin + "/robots.txt", 1);
      robotsByOrigin.set(pageOrigin, robotsParser(pageOrigin + "/robots.txt", rr.status === 200 ? rr.text : ""));
    }
    if (robotsByOrigin.get(pageOrigin).isAllowed(url, UA) === false) { out.errors.push("robots-disallow " + url); continue; }
    const res = await get(url);
    out.pages.push({ url, status: res.status, final: res.url, error: res.error });
    await sleep(delay);
    if (!res.text) continue;
    const $ = cheerio.load(res.text);
    $("a[href^='mailto:']").each((_, a) => {
      const e = decodeURIComponent(($(a).attr("href") ?? "").slice(7).split("?")[0]).trim().toLowerCase();
      if (e && !JUNK.test(e)) (out.emails[e] ??= new Set()).add(res.url + " (mailto)");
    });
    $("script,style,noscript").remove();
    const body = $("body").text();
    for (const m of body.matchAll(EMAIL)) {
      const e = m[0].toLowerCase().replace(/\.$/, "");
      if (!JUNK.test(e)) (out.emails[e] ??= new Set()).add(res.url);
    }
    if ($("form textarea").length) out.forms.push(res.url);
    const host = new URL(res.url || url).hostname.replace(/^www\./, "");
    $("a[href]").each((_, a) => {
      const label = ($(a).text() + " " + ($(a).attr("href") ?? "")).trim();
      if (!CONTACT_HINT.test(label)) return;
      try {
        const u = new URL($(a).attr("href"), res.url || url);
        if (!/^https?:$/.test(u.protocol)) return;
        if (u.hostname.replace(/^www\./, "") !== host) return;
        if (/\.(pdf|jpg|png|docx?|xlsx?)$/i.test(u.pathname)) return;
        u.hash = "";
        if (!seen.has(u.href) && queue.length < 20) queue.push(u.href);
      } catch { /* ignore malformed links */ }
    });
  }
  out.emails = Object.fromEntries(Object.entries(out.emails).map(([k, v]) => [k, [...v]]));
  return out;
}

// Different domains in parallel (limit 5); each domain crawled sequentially.
const list = seeds.filter((s) => !only || only.has(s.id));
const results = [];
let next = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (next < list.length) {
    const seed = list[next++];
    const t = Date.now();
    const r = await crawl(seed);
    r.duration_ms = Date.now() - t;
    results.push(r);
    console.log(`${seed.id}: ${r.pages.filter((p) => p.status === 200).length}/${r.pages.length} páginas, ${Object.keys(r.emails).length} correos, ${r.forms.length} formularios, ${r.duration_ms} ms`);
  }
}));
const file = new URL("./crawl-results.json", import.meta.url);
let previous = [];
try { previous = JSON.parse(await fs.readFile(file, "utf8")); } catch { /* first run */ }
const merged = new Map(previous.map((r) => [r.id, r]));
for (const r of results) merged.set(r.id, r);
await fs.writeFile(file, JSON.stringify([...merged.values()], null, 2));
