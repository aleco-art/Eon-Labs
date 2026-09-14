// End-to-end checks against a LOCAL stack: `npx supabase start` + `npm run dev -- -p 3100`
// with EMAIL_PROVIDER=smtp pointing at the local Mailpit. Never run against production.
// Usage: node tests/e2e.mjs   (env: BASE_URL, MAILPIT_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OUT_DIR)
import fs from "node:fs";
import { execSync } from "node:child_process";
import { chromium, devices } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MAIL = process.env.MAILPIT_URL ?? "http://127.0.0.1:55424";
const SB_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:55421";
const OUT = process.env.OUT_DIR ?? "tests/output";
if (!/localhost|127\.0\.0\.1/.test(BASE + SB_URL)) throw new Error("Solo contra un entorno local.");
fs.mkdirSync(OUT, { recursive: true });
const admin = createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 300) });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? " :: " + String(detail).slice(0, 200) : ""));
};
const step = async (name, fn) => {
  try { await fn(); } catch (e) { check(name, false, e.message.split("\n")[0]); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function mailTo(address, subjectPart, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + address)}`)).json();
    const hit = (list.messages ?? []).find((m) => !subjectPart || m.Subject.includes(subjectPart));
    if (hit) return (await fetch(`${MAIL}/api/v1/message/${hit.ID}`)).json();
    await wait(500);
  }
  return null;
}
const linkIn = (msg) => (msg.HTML.match(/href="([^"]+auth\/callback[^"]+)"/) ?? [])[1]?.replaceAll("&amp;", "&");

const stamp = Date.now();
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
fs.writeFileSync(`${OUT}/apoyo.png`, png);
fs.writeFileSync(`${OUT}/plano.pdf`, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");

const browser = await chromium.launch();
const ctxA = await browser.newContext();
const ctxB = await browser.newContext();
const A = await ctxA.newPage();
const B = await ctxB.newPage();
const errors = [];
for (const [n, p] of [["A", A], ["B", B]]) p.on("pageerror", (e) => errors.push(`${n}: ${e.message}`));
const users = { A: { name: "Ana Pérez", email: `ana-${stamp}@example.test` }, B: { name: "Beto Ríos", email: `beto-${stamp}@example.test` } };

async function signup(page, u) {
  await page.goto(BASE + "/cuenta?modo=registro");
  await page.getByLabel("Nombre público").fill(u.name);
  await page.getByLabel("Correo electrónico").fill(u.email);
  await page.getByLabel("Contraseña").fill("Prueba12345");
  await page.locator("form .check input").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByText("Te enviamos un correo para confirmar").waitFor({ timeout: 10000 });
  const msg = await mailTo(u.email, "Confirma");
  check(`Correo de confirmación recibido (${u.name})`, msg, msg?.Subject);
  await page.goto(linkIn(msg));
  await page.waitForURL(/\/perfil\/[0-9a-f-]{36}/, { timeout: 15000 });
  u.id = page.url().split("/").pop();
  await page.getByRole("heading", { level: 1, name: u.name }).waitFor({ timeout: 15000 });
  check(`Cuenta confirmada con sesión propia (${u.name})`, await page.getByRole("button", { name: "Salir" }).isVisible());
}

await step("registro", async () => {
  await signup(A, users.A);
  await signup(B, users.B);
  const a = await A.evaluate(() => document.cookie.length);
  check("Sesiones independientes en dos navegadores", users.A.id !== users.B.id && a >= 0, `${users.A.id} / ${users.B.id}`);
});

let proposalUrl = "";
await step("crear propuesta", async () => {
  await A.goto(BASE + "/crear");
  await A.getByLabel("Título").fill("Corredor peatonal arbolado en Calidonia");
  await A.getByLabel("Descripción").fill("Propongo convertir un tramo de calle en corredor peatonal con árboles nativos, bancas y señalización accesible para conectar las paradas del metro.");
  await A.getByLabel("Temática").selectOption("Urbanización");
  await A.getByLabel("Provincia o comarca", { exact: true }).selectOption({ label: "Panamá" });
  const districts = await A.getByLabel("Distrito", { exact: true }).locator("option").allTextContents();
  check("Distritos dependientes de la provincia", districts.includes("San Miguelito") && !districts.includes("David"), districts.length + " opciones");
  await A.getByLabel("Distrito", { exact: true }).selectOption({ label: "Panamá" });
  const corr = await A.getByLabel("Corregimiento", { exact: true }).locator("option").allTextContents();
  check("Corregimientos con alias de búsqueda", corr.some((c) => c.startsWith("La Exposición o Calidonia")), corr.length + " opciones");
  await A.getByLabel("Corregimiento", { exact: true }).selectOption({ index: corr.findIndex((c) => c.startsWith("La Exposición o Calidonia")) });
  await A.locator('input[type="file"]').setInputFiles([`${OUT}/apoyo.png`, `${OUT}/plano.pdf`]);
  await A.locator("form .check input").check();
  await A.getByRole("button", { name: "Publicar propuesta" }).click();
  await A.waitForURL(/\/propuesta\/[0-9a-f-]{36}$/, { timeout: 20000 });
  proposalUrl = A.url();
  await A.getByRole("heading", { level: 1, name: "Corredor peatonal arbolado en Calidonia" }).waitFor();
  check("Propuesta publicada sin errores de adjuntos", !proposalUrl.includes("adjuntos"), proposalUrl);
  await A.locator(".file a").first().waitFor();
  check("Dos adjuntos listados", (await A.locator(".file a").count()) === 2);
});

await step("adjuntos", async () => {
  const href = await A.locator(".file a").first().getAttribute("href");
  const own = await A.request.get(BASE + href, { maxRedirects: 0 });
  const other = await B.request.get(BASE + href, { maxRedirects: 0 });
  const anon = await fetch(BASE + href, { redirect: "manual" });
  check("Autor abre su adjunto", own.status() === 302, own.status());
  check("Otro usuario abre el adjunto público", other.status() === 302, other.status());
  check("Visitante abre el adjunto público", anon.status === 302, anon.status);
  const file = await fetch(anon.headers.get("location"));
  check("La URL firmada entrega el archivo", file.ok && (await file.arrayBuffer()).byteLength === png.length, file.status);
});

await step("interacciones", async () => {
  await B.goto(BASE + "/");
  await B.getByRole("link", { name: "Corredor peatonal arbolado en Calidonia" }).waitFor({ timeout: 10000 });
  check("B ve la propuesta de A en el feed", true);
  await B.goto(proposalUrl);
  await B.getByRole("heading", { level: 1 }).waitFor();
  check("B no ve herramientas del autor", !(await B.getByRole("link", { name: "Editar propuesta" }).isVisible()) && !(await B.getByText("Envía tu propuesta a quien le puede interesar").isVisible()));
  await B.getByRole("button", { name: "Apoyar" }).click();
  await B.getByRole("button", { name: "Retirar apoyo" }).waitFor();
  await B.getByRole("button", { name: "Republicar" }).click();
  await B.getByRole("button", { name: "Quitar republicación" }).waitFor();
  await B.locator("#comment-form textarea").fill("Muy buena idea, sumaría bebederos.");
  await B.getByRole("button", { name: "Comentar" }).click();
  await B.getByText("Muy buena idea, sumaría bebederos.").waitFor();
  await B.reload();
  await B.getByText("Muy buena idea, sumaría bebederos.").waitFor();
  const like = await B.getByRole("button", { name: "Retirar apoyo" }).innerText();
  check("Apoyo persiste tras recargar (1)", /1/.test(like), like);
  check("Republicación persiste tras recargar", await B.getByRole("button", { name: "Quitar republicación" }).isVisible());
  check("Comentario persiste tras recargar", true);
  const { data: rows } = await admin.from("proposals").select("id,like_count,reshare_count,comment_count");
  check("Republicar no duplica propuestas; contadores reales", rows.length === 1 && rows[0].like_count === 1 && rows[0].reshare_count === 1 && rows[0].comment_count === 1, JSON.stringify(rows));
  // Toggle off and on again: one like per user
  await B.getByRole("button", { name: "Retirar apoyo" }).click();
  await B.getByRole("button", { name: "Apoyar" }).waitFor();
  await B.getByRole("button", { name: "Apoyar" }).click();
  await B.getByRole("button", { name: "Retirar apoyo" }).waitFor();
  const { count } = await admin.from("likes").select("*", { count: "exact", head: true });
  check("Retirar y volver a apoyar deja un solo like", count === 1, count);
});

await step("respuestas", async () => {
  await A.reload();
  await A.getByRole("button", { name: "Responder" }).first().click();
  await A.locator("#comment-form textarea").fill("¡Gracias! Lo añado a la propuesta.");
  await A.locator("#comment-form").getByRole("button", { name: "Responder" }).click();
  await A.getByText("¡Gracias! Lo añado a la propuesta.").waitFor();
  await A.reload();
  await A.locator(".comment.reply").first().waitFor({ timeout: 15000 });
  check("Respuesta anidada persiste", await A.locator(".comment.reply").getByText("en respuesta a Beto Ríos").isVisible());
});

await step("edición ajena bloqueada", async () => {
  await B.goto(proposalUrl + "/editar");
  await B.getByText("No puedes editar esta propuesta.").waitFor({ timeout: 10000 });
  check("B no puede abrir la edición de la propuesta de A", true);
});

await step("perfil y republicación", async () => {
  await B.goto(`${BASE}/perfil/${users.B.id}`);
  await B.getByRole("heading", { name: "Republicaciones" }).waitFor();
  const card = B.locator(".proposal-card", { hasText: "Corredor peatonal arbolado en Calidonia" });
  check("Perfil de B muestra la republicación con la autoría de A", (await card.count()) === 1 && (await card.getByText("Ana Pérez").isVisible()));
});

await step("filtros", async () => {
  await B.goto(BASE + "/crear");
  await B.getByLabel("Título").fill("Festival gastronómico en Boquete");
  await B.getByLabel("Descripción").fill("Una feria anual con productores locales de café, cocina chiricana y música en vivo en la plaza del pueblo.");
  await B.getByLabel("Temática").selectOption("Gastronomía");
  await B.getByLabel("Provincia o comarca", { exact: true }).selectOption({ label: "Chiriquí" });
  await B.getByLabel("Distrito", { exact: true }).selectOption({ label: "Boquete" });
  await B.locator("form .check input").check();
  await B.getByRole("button", { name: "Publicar propuesta" }).click();
  await B.waitForURL(/\/propuesta\//);
  await A.goto(BASE + "/");
  const cards = A.locator(".feed-grid .proposal-card h3");
  const titles = async () => { await wait(900); return cards.allTextContents(); };
  await A.getByLabel("Buscar propuestas").fill("gastronomico");
  let t = await titles();
  check("Búsqueda sin tildes", t.length === 1 && t[0].includes("gastronómico"), t.join(" | "));
  await A.getByLabel("Buscar propuestas").fill("CALIDONIA");
  t = await titles();
  check("Búsqueda sin distinguir mayúsculas", t.length === 1 && t[0].includes("Calidonia"), t.join(" | "));
  await A.getByLabel("Buscar propuestas").fill("");
  await A.getByLabel("Temática", { exact: true }).selectOption("Urbanización");
  t = await titles();
  check("Filtro por temática", t.length === 1 && t[0].includes("Calidonia"), t.join(" | "));
  await A.getByLabel("Temática", { exact: true }).selectOption("");
  await A.locator(".filters").getByLabel("Provincia o comarca", { exact: true }).selectOption({ label: "Chiriquí" });
  t = await titles();
  check("Filtro por provincia", t.length === 1 && t[0].includes("Boquete"), t.join(" | "));
  await A.locator(".filters").getByLabel("Distrito", { exact: true }).selectOption({ label: "Boquete" });
  t = await titles();
  check("Filtro por distrito", t.length === 1, t.join(" | "));
  await A.locator(".filters").getByLabel("Provincia o comarca", { exact: true }).selectOption("");
  await A.getByLabel("Alcance").selectOption("nacional");
  t = await titles();
  check("Filtro de alcance nacional excluye propuestas locales", t.length === 0, t.join(" | "));
  await A.getByLabel("Alcance").selectOption("");
  await A.getByLabel("Fecha").selectOption("7");
  t = await titles();
  check("Filtro por fecha (últimos 7 días)", t.length === 2, t.join(" | "));
  await A.getByLabel("Fecha").selectOption("");
  await A.getByLabel("Ordenar").selectOption("popular");
  t = await titles();
  check("Orden por popularidad", t[0]?.includes("Calidonia"), t.join(" | "));
  await A.getByLabel("Ordenar").selectOption("recent");
  t = await titles();
  check("Orden por fecha", t[0]?.includes("Boquete"), t.join(" | "));
});

await step("destinatarios y envío", async () => {
  await A.goto(proposalUrl);
  const panel = A.locator(".send-panel");
  await panel.getByText("Sugeridos para «Urbanización»").waitFor();
  await panel.locator(".recipient h4").first().waitFor({ timeout: 15000 });
  const names = await panel.locator(".recipient h4").allTextContents();
  check("Sugiere responsables por área y territorio", names.some((n) => n.includes("Vivienda y Ordenamiento")) && names.some((n) => n.includes("Municipio de Panamá")), names.join(" | "));
  check("No sugiere municipios de otros distritos", !names.some((n) => /Municipio de (David|San Miguelito|Colón)/.test(n)), names.join(" | "));
  const miviot = panel.locator(".recipient", { hasText: "Ministerio de Vivienda y Ordenamiento Territorial" }).first();
  check("Cada sugerencia muestra fuente, tipo y fecha", (await miviot.getByText("Fuente oficial").isVisible()) && (await miviot.getByText(/Consultado el/).isVisible()) && (await miviot.locator(".source a").getAttribute("href"))?.startsWith("https://www.miviot.gob.pa"));
  check("Sugerencia sin correo lo indica", (await panel.getByText("Sin correo publicado").count()) >= 1);
  await miviot.getByRole("button", { name: "Añadir" }).click();
  await miviot.getByRole("button", { name: "En tu lista" }).waitFor();
  const spia = panel.locator(".recipient", { hasText: "Sociedad Panameña de Ingenieros" }).first();
  if (await spia.count()) { await spia.getByRole("button", { name: "Añadir" }).click(); await spia.getByRole("button", { name: "En tu lista" }).waitFor(); }
  await panel.getByRole("button", { name: "Añadir destinatario manualmente" }).click();
  await panel.getByLabel("Organización o persona").fill("Junta Comunal de Calidonia (prueba)");
  await panel.getByLabel("Correo profesional público").fill("junta.prueba@example.test");
  await panel.getByRole("button", { name: "Guardar destinatario" }).click();
  await panel.getByText("junta.prueba@example.test").waitFor();
  await A.reload();
  await A.locator(".send-panel .subpanel .recipient").first().waitFor({ timeout: 15000 });
  const savedCount = await A.locator(".send-panel .subpanel .recipient").count();
  check("La lista de destinatarios persiste tras recargar", savedCount >= 2, savedCount);

  // Select all saved recipients and review
  for (const box of await A.locator(".send-panel .subpanel .recipient input[type=checkbox]").all()) await box.check();
  await A.getByRole("button", { name: /Revisar envío/ }).click();
  const review = A.locator("#revision-envio");
  await review.waitFor();
  check("Revisión muestra destinatarios, asunto, mensaje y enlace", (await review.getByRole("textbox", { name: "Asunto", exact: true }).isVisible()) && (await review.getByRole("textbox", { name: "Mensaje", exact: true }).isVisible()) && (await review.getByText(proposalUrl).first().isVisible()));
  const sendBtn = review.getByRole("button", { name: /Confirmar y enviar/ });
  check("No se puede enviar sin confirmar", await sendBtn.isDisabled());
  await review.getByLabel(/Autorizo usar mi correo/).check();
  await review.locator(".check", { hasText: "Plano" }).count();
  await review.getByLabel(/He revisado destinatarios/).check();
  await sendBtn.click();
  await review.locator(".delivery").first().waitFor({ timeout: 30000 });
  const statuses = await review.locator(".delivery .st").allTextContents();
  check("Envío aceptado por el proveedor para cada destinatario", statuses.length === savedCount && statuses.every((s) => s.includes("Aceptado")), statuses.join(" | "));
  const msg = await mailTo("junta.prueba@example.test", "Propuesta ciudadana");
  check("El correo llega al buzón de pruebas con el enlace público", msg && msg.HTML.includes(proposalUrl) && /no representa a ninguna entidad/i.test(msg.Text), msg?.Subject);
  check("Remitente de la plataforma y respuesta al autor (con consentimiento)", msg?.From?.Address === "propuestas@istmo.test" && msg?.ReplyTo?.[0]?.Address === users.A.email, JSON.stringify({ from: msg?.From, replyTo: msg?.ReplyTo }));
  const miviotMail = await mailTo("oterritorial@miviot.gob.pa", "Propuesta ciudadana");
  check("El correo al responsable real queda capturado localmente (no sale a internet)", Boolean(miviotMail), miviotMail?.Subject);
  await A.reload();
  await A.locator(".send-panel > .delivery").first().waitFor({ timeout: 15000 });
  check("Historial muestra estado real", (await A.locator(".send-panel > .delivery .st", { hasText: "Aceptado por el proveedor" }).count()) === savedCount);
  await B.goto(proposalUrl);
  await B.getByRole("heading", { level: 1 }).waitFor();
  check("Estado público «Compartida con destinatarios»", await B.locator(".detail .status.shared").isVisible());
  const { data: leak } = await createClient(SB_URL, process.env.SUPABASE_ANON_KEY).from("deliveries").select("*");
  check("Los envíos no son visibles públicamente", (leak ?? []).length === 0);

  // Duplicate protection
  await A.locator(".send-panel .subpanel .recipient input[type=checkbox]").first().check();
  await A.getByRole("button", { name: /Revisar envío/ }).click();
  await A.locator("#revision-envio").getByLabel(/He revisado destinatarios/).check();
  await A.locator("#revision-envio").getByRole("button", { name: /Confirmar y enviar/ }).click();
  await A.locator("#revision-envio .delivery").first().waitFor({ timeout: 20000 });
  const dup = await A.locator("#revision-envio .delivery").first().innerText();
  check("No reenvía al mismo destinatario en 30 días", /No enviado/.test(dup) && /30 días/.test(dup), dup);
});

await step("fallo del proveedor", async () => {
  await A.goto(proposalUrl);
  const panel = A.locator(".send-panel");
  await panel.getByRole("button", { name: "Añadir destinatario manualmente" }).click();
  await panel.getByLabel("Organización o persona").fill("Destinatario de fallo");
  await panel.getByLabel("Correo profesional público").fill("fallo.prueba@example.test");
  await panel.getByRole("button", { name: "Guardar destinatario" }).click();
  await panel.getByText("fallo.prueba@example.test").waitFor();
  for (const box of await panel.locator(".subpanel .recipient input[type=checkbox]").all()) await box.uncheck();
  await panel.locator(".subpanel .recipient", { hasText: "fallo.prueba@example.test" }).locator("input[type=checkbox]").check();
  execSync("docker stop supabase_inbucket_istmo-local", { stdio: "ignore" });
  try {
    await A.getByRole("button", { name: /Revisar envío/ }).click();
    await A.locator("#revision-envio").getByLabel(/He revisado destinatarios/).check();
    await A.locator("#revision-envio").getByRole("button", { name: /Confirmar y enviar/ }).click();
    await A.locator("#revision-envio .delivery").first().waitFor({ timeout: 30000 });
    const text = await A.locator("#revision-envio .delivery").first().innerText();
    check("Si el proveedor falla, se registra «Envío fallido»", /Envío fallido/.test(text), text);
    const { data } = await admin.from("deliveries").select("status").eq("recipient", "fallo.prueba@example.test");
    check("El fallo queda en la base de datos", data?.[0]?.status === "failed", JSON.stringify(data));
  } finally {
    execSync("docker start supabase_inbucket_istmo-local", { stdio: "ignore" });
  }
});

await step("moderación", async () => {
  await B.goto(proposalUrl);
  await B.getByRole("button", { name: "Reportar propuesta" }).click();
  await B.locator(".subpanel textarea").fill("Prueba de reporte de spam");
  await B.getByRole("button", { name: "Enviar reporte" }).click();
  await B.getByText("Gracias. El equipo de moderación lo revisará.").waitFor();
  await A.goto(BASE + "/moderacion");
  await A.getByText("Acceso restringido").waitFor();
  check("Un usuario normal no accede a moderación", true);
  await admin.from("moderators").insert({ user_id: users.A.id });
  await A.reload();
  await A.getByText("Prueba de reporte de spam").waitFor({ timeout: 10000 });
  await A.getByRole("button", { name: "Ocultar" }).first().click();
  await A.getByText("Acción registrada.").waitFor();
  await B.goto(proposalUrl);
  await B.getByText("Propuesta no disponible.").waitFor({ timeout: 10000 });
  check("Contenido oculto por moderación deja de ser público", true);
  await admin.from("proposals").update({ hidden: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("moderators").delete().eq("user_id", users.A.id);
});

await step("cierre de sesión", async () => {
  await B.goto(BASE + "/");
  await B.getByRole("button", { name: "Salir" }).click();
  await B.getByRole("link", { name: "Iniciar sesión" }).first().waitFor();
  await B.goto(proposalUrl);
  await B.getByRole("button", { name: "Apoyar" }).click();
  await B.getByText("Inicia sesión para apoyar o republicar.").waitFor();
  check("Visitante no puede apoyar", true);
  check("Visitante ve aviso para comentar", await B.getByText("Necesitas una cuenta para comentar.").isVisible());
});

await step("recuperación de contraseña", async () => {
  const P = await (await browser.newContext()).newPage();
  await P.goto(BASE + "/cuenta");
  await P.getByRole("button", { name: "Olvidé mi contraseña" }).click();
  await P.getByLabel("Correo electrónico").fill(users.B.email);
  await P.getByRole("button", { name: "Enviar enlace" }).click();
  await P.getByText(/recibirás un enlace/).waitFor();
  const msg = await mailTo(users.B.email, "Restablece");
  check("Correo de recuperación recibido", msg, msg?.Subject);
  await P.goto(linkIn(msg));
  await P.getByRole("heading", { name: "Elige una contraseña nueva" }).waitFor({ timeout: 15000 });
  await P.getByLabel("Nueva contraseña").fill("NuevaClave123");
  await P.getByRole("button", { name: "Guardar contraseña" }).click();
  await P.getByText("Contraseña actualizada.").waitFor();
  const C = await (await browser.newContext()).newPage();
  await C.goto(BASE + "/cuenta");
  await C.getByLabel("Correo electrónico").fill(users.B.email);
  await C.getByLabel("Contraseña").fill("NuevaClave123");
  await C.locator("form").getByRole("button", { name: "Iniciar sesión" }).click();
  await C.waitForURL(BASE + "/");
  check("Inicio de sesión con la contraseña nueva", true);
});

await step("directorio", async () => {
  const P = await (await browser.newContext()).newPage();
  await P.goto(BASE + "/responsables");
  await P.getByText(/responsables ·/).waitFor({ timeout: 15000 });
  const line = await P.locator(".results-line").innerText();
  check("Directorio carga desde la base de datos", /^109 responsables/.test(line), line);
  await P.getByLabel("Área").selectOption("Deportes");
  await P.getByLabel("Provincia").selectOption({ label: "Chiriquí" });
  const names = await P.locator(".entry h3").allTextContents();
  check("Filtro de directorio por área y provincia", names.includes("Municipio de David") && names.includes("Comité Olímpico de Panamá") && !names.includes("Municipio de Colón"), names.slice(0, 6).join(" | "));
  const terr = await (await fetch(BASE + "/api/territorios")).json();
  check("Territorios servidos desde la base de datos", terr.length === 699, terr.length);
});

await step("móvil", async () => {
  const M = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  for (const [name, path] of [["inicio", "/"], ["detalle", proposalUrl ? new URL(proposalUrl).pathname : "/"], ["responsables", "/responsables"], ["crear", "/crear"]]) {
    await M.goto(BASE + path);
    await wait(2500);
    const overflow = await M.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`Sin desbordamiento horizontal en móvil (${name})`, overflow <= 1, overflow + "px");
    await M.screenshot({ path: `${OUT}/movil-${name}.png` });
  }
  await M.getByRole("button", { name: "Abrir menú" }).click();
  check("Menú móvil abre la navegación", await M.getByRole("link", { name: "Responsables por área" }).last().isVisible());
});

if (proposalUrl) await A.goto(proposalUrl);
await A.waitForTimeout(2000);
await A.screenshot({ path: `${OUT}/detalle-autor.png`, fullPage: true });
await A.goto(BASE + "/");
await A.waitForTimeout(2000);
await A.screenshot({ path: `${OUT}/inicio.png`, fullPage: true });
await browser.close();

check("Sin errores de JavaScript en las páginas", errors.length === 0, errors.join(" || "));
const failed = results.filter((r) => !r.ok);
fs.writeFileSync(`${OUT}/e2e-results.json`, JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones superadas`);
process.exit(failed.length ? 1 : 0);
