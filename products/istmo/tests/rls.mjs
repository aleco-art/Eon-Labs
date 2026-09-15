// Adversarial permission checks (RLS, column grants, storage) against a LOCAL Supabase stack.
// Usage: SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node tests/rls.mjs
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.SUPABASE_URL ?? "http://127.0.0.1:55421";
if (!/^http:\/\/127\.0\.0\.1:/.test(URL_)) throw new Error("Solo contra un entorno local.");
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? " :: " + detail : ""));
};

async function user(tag) {
  const email = `${tag}-${Date.now()}@example.test`;
  const password = "Prueba12345";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name: "Persona " + tag },
  });
  if (error) throw error;
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const s = await c.auth.signInWithPassword({ email, password });
  if (s.error) throw s.error;
  return { c, id: data.user.id, email };
}

const A = await user("a");
const B = await user("b");
const anon = createClient(URL_, ANON, { auth: { persistSession: false } });

// Proposal by A
const ins = await A.c.from("proposals").insert({
  author_id: A.id, title: "Aceras accesibles en Bella Vista",
  body: "Propongo rampas y aceras continuas en las calles principales del corregimiento.",
  category: "Urbanización", province: "08", district: "0808", corregimiento: "080801",
}).select("id").single();
check("A crea propuesta", !ins.error, ins.error?.message);
const pid = ins.data?.id;

const bRead = await B.c.from("proposals").select("id,title").eq("id", pid);
check("B ve la propuesta de A", bRead.data?.length === 1);
const anonRead = await anon.from("proposals").select("id").eq("id", pid);
check("Visitante sin sesión ve la propuesta", anonRead.data?.length === 1);

const bUpd = await B.c.from("proposals").update({ title: "Editado por B" }).eq("id", pid).select();
const after1 = await admin.from("proposals").select("title").eq("id", pid).single();
check("B no puede editar propuesta de A", after1.data.title !== "Editado por B", JSON.stringify(bUpd.error ?? bUpd.data));
const bDel = await B.c.from("proposals").delete().eq("id", pid).select();
const still = await admin.from("proposals").select("id").eq("id", pid);
check("B no puede borrar propuesta de A", still.data.length === 1, JSON.stringify(bDel.error ?? bDel.data));
const forged = await B.c.from("proposals").insert({ author_id: A.id, title: "Suplantación de autoría", body: "Texto suficientemente largo para pasar las validaciones del esquema.", category: "Otras" });
check("B no puede publicar como A", Boolean(forged.error), forged.error?.message);
const hide = await A.c.from("proposals").update({ hidden: true }).eq("id", pid);
check("Autor no puede cambiar 'hidden'", Boolean(hide.error), hide.error?.message);
const share = await A.c.from("proposals").update({ shared_at: new Date().toISOString() }).eq("id", pid);
check("Autor no puede marcarse 'compartida' sin envío", Boolean(share.error), share.error?.message);
const badTerr = await A.c.from("proposals").insert({ author_id: A.id, title: "Relación territorial inválida", body: "Texto suficientemente largo para pasar las validaciones del esquema.", category: "Otras", province: "01", district: "0808", corregimiento: "080801" });
check("Rechaza relación territorial incoherente", Boolean(badTerr.error), badTerr.error?.message);

// Profiles
const pB = await B.c.from("profiles").update({ name: "Hackeado" }).eq("id", A.id).select();
const pA = await admin.from("profiles").select("name").eq("id", A.id).single();
check("B no puede editar perfil de A", pA.data.name !== "Hackeado", JSON.stringify(pB.data));
const ownP = await B.c.from("profiles").update({ bio: "Hola", location: "David" }).eq("id", B.id).select();
check("B edita su propio perfil", ownP.data?.length === 1, ownP.error?.message);
const cols = await anon.from("profiles").select("*").eq("id", A.id).single();
check("Perfil público no expone correo", cols.data && !JSON.stringify(cols.data).includes(A.email), Object.keys(cols.data ?? {}).join(","));
const emailLeak = await anon.from("profiles").select("email").limit(1);
check("Columna email no existe en perfiles", Boolean(emailLeak.error));

// Likes & reshares
const lk = await B.c.from("likes").insert({ proposal_id: pid, user_id: B.id });
check("B da like", !lk.error, lk.error?.message);
const lk2 = await B.c.from("likes").insert({ proposal_id: pid, user_id: B.id });
check("Like duplicado rechazado", Boolean(lk2.error));
const lkForge = await B.c.from("likes").insert({ proposal_id: pid, user_id: A.id });
check("B no puede dar like en nombre de A", Boolean(lkForge.error));
const rs = await B.c.from("reshares").insert({ proposal_id: pid, user_id: B.id });
check("B republica", !rs.error, rs.error?.message);
const countP = await admin.from("proposals").select("id", { count: "exact", head: true });
check("Republicar no duplica la propuesta", countP.count === 1, "proposals=" + countP.count);
const aUnlikeB = await A.c.from("likes").delete().eq("proposal_id", pid).eq("user_id", B.id).select();
const lkLeft = await admin.from("likes").select("user_id").eq("proposal_id", pid);
check("A no puede retirar el like de B", lkLeft.data.length === 1, JSON.stringify(aUnlikeB.data));

// Comments
const cm = await A.c.from("comments").insert({ proposal_id: pid, author_id: A.id, body: "Comentario de A" }).select("id").single();
check("A comenta", !cm.error, cm.error?.message);
const rep = await B.c.from("comments").insert({ proposal_id: pid, author_id: B.id, parent_id: cm.data.id, body: "Respuesta de B" }).select("id").single();
check("B responde a A", !rep.error, rep.error?.message);
const bEditC = await B.c.from("comments").update({ body: "Editado por B" }).eq("id", cm.data.id).select();
const cAfter = await admin.from("comments").select("body").eq("id", cm.data.id).single();
check("B no puede editar comentario de A", cAfter.data.body === "Comentario de A", JSON.stringify(bEditC.data));
const bDelC = await B.c.from("comments").delete().eq("id", cm.data.id).select();
const cLeft = await admin.from("comments").select("id").eq("id", cm.data.id);
check("B no puede borrar comentario de A", cLeft.data.length === 1, JSON.stringify(bDelC.data));
const reassign = await B.c.from("comments").update({ author_id: A.id }).eq("id", rep.data.id);
check("No se puede reasignar autoría de comentario", Boolean(reassign.error), reassign.error?.message);

// Updates, reports, moderators
const upd = await B.c.from("updates").insert({ proposal_id: pid, author_id: B.id, body: "Falsa actualización" });
check("B no puede publicar actualización en propuesta de A", Boolean(upd.error));
const repForge = await B.c.from("reports").insert({ proposal_id: pid, reporter_id: A.id, reason: "Reporte falso" });
check("B no puede reportar como A", Boolean(repForge.error));
const repOk = await B.c.from("reports").insert({ proposal_id: pid, reporter_id: B.id, reason: "Spam de prueba" });
check("B puede reportar", !repOk.error, repOk.error?.message);
const aReports = await A.c.from("reports").select("*");
check("A no ve reportes de B", (aReports.data ?? []).length === 0);
const mod = await B.c.from("moderators").insert({ user_id: B.id });
check("B no puede nombrarse moderador", Boolean(mod.error));
const lim = await B.c.rpc("consume_limit", { p_user: B.id, p_action: "email", p_limit: 999 });
check("Usuario no puede manipular límites", Boolean(lim.error));

// Private tables
await admin.from("deliveries").insert({ proposal_id: pid, user_id: A.id, recipient: "destinatario@example.test", subject: "Asunto", body: "Cuerpo del mensaje", idempotency_key: crypto.randomUUID() });
await admin.from("research_jobs").insert({ proposal_id: pid, user_id: A.id, depth: "standard", status: "partial" });
const bDel2 = await B.c.from("deliveries").select("*");
check("B no ve envíos de A", (bDel2.data ?? []).length === 0);
const anonDel = await anon.from("deliveries").select("*");
check("Visitante no ve envíos", (anonDel.data ?? []).length === 0);
const aDel = await A.c.from("deliveries").select("*");
check("A ve sus envíos", (aDel.data ?? []).length === 1);
const bJobs = await B.c.from("research_jobs").select("*");
check("B no ve investigaciones de A", (bJobs.data ?? []).length === 0);
const bIns = await B.c.from("deliveries").insert({ proposal_id: pid, user_id: B.id, recipient: "x@example.test", subject: "x", body: "x", idempotency_key: crypto.randomUUID(), status: "delivered" });
check("Usuario no puede fabricar registros de envío", Boolean(bIns.error));

// Storage
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const upA = await A.c.storage.from("proposal-files").upload(`${A.id}/${pid}/prueba.png`, png, { contentType: "image/png" });
check("A sube adjunto a su propuesta", !upA.error, upA.error?.message);
await A.c.from("attachments").insert({ proposal_id: pid, owner_id: A.id, path: `${A.id}/${pid}/prueba.png`, name: "prueba.png", mime: "image/png", size: png.length });
const upB = await B.c.storage.from("proposal-files").upload(`${A.id}/${pid}/intruso.png`, png, { contentType: "image/png" });
check("B no puede subir en carpeta de A", Boolean(upB.error));
const upB2 = await B.c.storage.from("proposal-files").upload(`${B.id}/${pid}/intruso.png`, png, { contentType: "image/png" });
check("B no puede adjuntar a propuesta de A", Boolean(upB2.error));
const rmB = await B.c.storage.from("proposal-files").remove([`${A.id}/${pid}/prueba.png`]);
const exists = await admin.storage.from("proposal-files").list(`${A.id}/${pid}`);
check("B no puede borrar adjunto de A", exists.data?.some((o) => o.name === "prueba.png"), JSON.stringify(rmB.data));
const html = await A.c.storage.from("proposal-files").upload(`${A.id}/${pid}/x.html`, "<script>alert(1)</script>", { contentType: "text/html" });
check("Bucket rechaza tipos no permitidos", Boolean(html.error), html.error?.message);
const big = await A.c.storage.from("avatars").upload(`${A.id}/big.png`, new Uint8Array(3 * 1024 * 1024), { contentType: "image/png" });
check("Avatar > 2 MB rechazado", Boolean(big.error), big.error?.message);
const anonFile = await anon.storage.from("proposal-files").createSignedUrl(`${A.id}/${pid}/prueba.png`, 60);
check("Visitante puede ver adjunto de propuesta pública", !anonFile.error, anonFile.error?.message);

// v2: directory, recipient lists, counters and moderation data
const dirWrite = await B.c.from("responsables").update({ email: "falso@example.test" }).eq("id", "aig-311").select();
const dirAfter = await admin.from("responsables").select("email").eq("id", "aig-311").single();
check("Usuario no puede modificar el directorio", dirAfter.data.email === "info@311.gob.pa", JSON.stringify(dirWrite.data));
const recA = await A.c.from("proposal_recipients").insert({ proposal_id: pid, author_id: A.id, name: "Destino de A", email: "destino@example.test", source_kind: "manual" }).select("id").single();
check("Autor guarda destinatarios en su propuesta", !recA.error, recA.error?.message);
const recB = await B.c.from("proposal_recipients").insert({ proposal_id: pid, author_id: B.id, name: "Intruso", email: "intruso@example.test", source_kind: "manual" });
check("B no puede añadir destinatarios a la propuesta de A", Boolean(recB.error));
const recRead = await B.c.from("proposal_recipients").select("*");
check("B no ve la lista de destinatarios de A", (recRead.data ?? []).length === 0);
const counter = await A.c.from("proposals").update({ like_count: 999 }).eq("id", pid);
check("Contadores no editables por el autor", Boolean(counter.error), counter.error?.message);
const logRead = await B.c.from("moderation_log").select("*");
check("Registro de moderación no visible para usuarios", (logRead.data ?? []).length === 0);

// Launch: signatures, forged counters on insert, photos and profile contact details
const forgedInsert = await B.c.from("proposals").insert({ author_id: B.id, title: "Contadores inflados al crear", body: "Texto suficientemente largo para pasar las validaciones del esquema.", category: "Otras", like_count: 999, signature_count: 999 });
check("No se pueden fijar contadores al crear una propuesta", Boolean(forgedInsert.error), forgedInsert.error?.message);
const forgedHidden = await B.c.from("proposals").insert({ author_id: B.id, title: "Propuesta ya compartida al crear", body: "Texto suficientemente largo para pasar las validaciones del esquema.", category: "Otras", shared_at: new Date().toISOString() });
check("No se puede crear una propuesta marcada como compartida", Boolean(forgedHidden.error), forgedHidden.error?.message);
const signClosed = await B.c.from("signatures").insert({ proposal_id: pid, user_id: B.id, signer_name: "Persona b" });
check("No se puede firmar si la recogida no está activa", Boolean(signClosed.error), signClosed.error?.message);
const bEnable = await B.c.from("proposals").update({ signatures_enabled: true }).eq("id", pid).select();
const stillOff = await admin.from("proposals").select("signatures_enabled").eq("id", pid).single();
check("B no puede activar firmas en la propuesta de A", !stillOff.data.signatures_enabled, JSON.stringify(bEnable.data));
const aEnable = await A.c.from("proposals").update({ signatures_enabled: true, signature_goal: 100 }).eq("id", pid).select("signatures_enabled,signature_goal").single();
check("Autor activa la recogida de firmas con meta", aEnable.data?.signatures_enabled === true && aEnable.data?.signature_goal === 100, aEnable.error?.message);
const badGoal = await A.c.from("proposals").update({ signature_goal: 3 }).eq("id", pid);
check("Meta de firmas fuera de rango rechazada", Boolean(badGoal.error), badGoal.error?.message);
const signB = await B.c.from("signatures").insert({ proposal_id: pid, user_id: B.id, signer_name: "Persona b", reason: "Lo necesito" });
check("B firma la propuesta", !signB.error, signB.error?.message);
const signB2 = await B.c.from("signatures").insert({ proposal_id: pid, user_id: B.id, signer_name: "Persona b otra vez" });
check("Firma duplicada rechazada", Boolean(signB2.error), signB2.error?.message);
const signForge = await B.c.from("signatures").insert({ proposal_id: pid, user_id: A.id, signer_name: "Persona a" });
check("B no puede firmar en nombre de A", Boolean(signForge.error), signForge.error?.message);
const signAnon = await A.c.from("signatures").insert({ proposal_id: pid, user_id: A.id, signer_name: "Persona a", public_name: false });
check("A firma de forma anónima", !signAnon.error, signAnon.error?.message);
const anonSign = await anon.from("signatures").insert({ proposal_id: pid, user_id: B.id, signer_name: "Visitante" });
check("Visitante sin sesión no puede firmar", Boolean(anonSign.error), anonSign.error?.message);
const sigCount = await admin.from("proposals").select("signature_count,popularity").eq("id", pid).single();
check("Contador de firmas calculado por la base de datos", sigCount.data.signature_count === 2, JSON.stringify(sigCount.data));
const publicSigs = await anon.from("signatures").select("signer_name,public_name").eq("proposal_id", pid);
check("Visitante ve solo firmas públicas", publicSigs.data?.length === 1 && publicSigs.data[0].signer_name === "Persona b", JSON.stringify(publicSigs.data));
const bSeesAnon = await B.c.from("signatures").select("signer_name").eq("proposal_id", pid).eq("user_id", A.id);
check("Nombre de firma anónima no visible para otros", (bSeesAnon.data ?? []).length === 0, JSON.stringify(bSeesAnon.data));
const aSeesOwn = await A.c.from("signatures").select("signer_name").eq("proposal_id", pid).eq("user_id", A.id);
check("Quien firma de forma anónima ve su propia firma", aSeesOwn.data?.length === 1);
const editSig = await B.c.from("signatures").update({ signer_name: "Cambiado" }).eq("proposal_id", pid).eq("user_id", B.id);
check("Las firmas no se editan", Boolean(editSig.error), editSig.error?.message);
const aDelB = await A.c.from("signatures").delete().eq("proposal_id", pid).eq("user_id", B.id).select();
const bSigLeft = await admin.from("signatures").select("user_id").eq("proposal_id", pid).eq("user_id", B.id);
check("A no puede borrar la firma de B", bSigLeft.data.length === 1, JSON.stringify(aDelB.data));
const counterSig = await A.c.from("proposals").update({ signature_count: 5000 }).eq("id", pid);
check("Contador de firmas no editable por el autor", Boolean(counterSig.error), counterSig.error?.message);
const bWithdraw = await B.c.from("signatures").delete().eq("proposal_id", pid).eq("user_id", B.id);
const afterWithdraw = await admin.from("proposals").select("signature_count").eq("id", pid).single();
check("Retirar la firma actualiza el contador", !bWithdraw.error && afterWithdraw.data.signature_count === 1, JSON.stringify(afterWithdraw.data));
const pdfPhoto = await A.c.from("attachments").insert({ proposal_id: pid, owner_id: A.id, path: `${A.id}/${pid}/foto.pdf`, name: "foto.pdf", mime: "application/pdf", size: 10, kind: "foto" });
check("Una foto no puede ser un PDF", Boolean(pdfPhoto.error), pdfPhoto.error?.message);
const contactOk = await B.c.from("profiles").update({ occupation: "Arquitecta", contact_email: "beto@example.test", phone: "+507 6000-0000", website: "https://example.test", instagram: "beto.rios", linkedin: "https://www.linkedin.com/in/beto" }).eq("id", B.id).select("phone").single();
check("B añade datos de contacto opcionales", contactOk.data?.phone === "+507 6000-0000", contactOk.error?.message);
const badPhone = await B.c.from("profiles").update({ phone: "llámame<script>" }).eq("id", B.id);
check("Teléfono con formato inválido rechazado", Boolean(badPhone.error), badPhone.error?.message);
const badSite = await B.c.from("profiles").update({ website: "javascript:alert(1)" }).eq("id", B.id);
check("Web con esquema no permitido rechazada", Boolean(badSite.error), badSite.error?.message);
const bContactA = await B.c.from("profiles").update({ phone: "+507 1111-1111" }).eq("id", A.id).select();
const aPhone = await admin.from("profiles").select("phone").eq("id", A.id).single();
check("B no puede editar el contacto de A", aPhone.data.phone === null, JSON.stringify(bContactA.data));
const accountEmail = await anon.from("profiles").select("*").eq("id", B.id).single();
check("El correo de la cuenta sigue sin exponerse", !JSON.stringify(accountEmail.data).includes(B.email), Object.keys(accountEmail.data ?? {}).join(","));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones superadas`);
process.exit(failed.length ? 1 : 0);
