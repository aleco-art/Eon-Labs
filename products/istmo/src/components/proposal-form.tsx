"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGate, emptyTerritory, Notice, TerritorySelect, type TerritoryValue } from "./common";
import { useSession } from "./shell";
import { browserDb } from "@/lib/supabase/client";
import { categories } from "@/lib/domain";
import { validateFile } from "@/lib/files";

export function ProposalForm({ id }: { id?: string }) {
  const { user } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("");
  const [scope, setScope] = useState<"nacional" | "local">("local");
  const [territory, setTerritory] = useState<TerritoryValue>(emptyTerritory);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    browserDb()
      .from("proposals")
      .select("title,body,category,province,district,corregimiento")
      .eq("id", id)
      .eq("author_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return setForbidden(true);
        setTitle(data.title);
        setBody(data.body);
        setCategory(data.category);
        setScope(data.province ? "local" : "nacional");
        setTerritory({ province: data.province ?? "", district: data.district ?? "", corregimiento: data.corregimiento ?? "" });
        setLoaded(true);
      });
  }, [id, user]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setMessage("");
    if (scope === "local" && !territory.province) return setMessage("Elige al menos la provincia o comarca, o marca «Todo Panamá».");
    setBusy(true);
    try {
      const files = (new FormData(e.currentTarget).getAll("files") as File[]).filter((f) => f.size);
      if (files.length > 5) throw new Error("Puedes adjuntar hasta 5 archivos.");
      for (const f of files) await validateFile(f);
      const db = browserDb();
      const payload = {
        title: title.trim(),
        body: body.trim(),
        category,
        province: scope === "local" ? territory.province || null : null,
        district: scope === "local" ? territory.district || null : null,
        corregimiento: scope === "local" ? territory.corregimiento || null : null,
      };
      const result = id
        ? await db.from("proposals").update(payload).eq("id", id).eq("author_id", user.id).select("id").single()
        : await db.from("proposals").insert({ ...payload, author_id: user.id }).select("id").single();
      if (result.error)
        throw new Error(result.error.code === "P0001" ? result.error.message : "No se pudo guardar la propuesta. Revisa los campos e inténtalo de nuevo.");
      let failed = 0;
      for (const file of files) {
        const upload = new FormData();
        upload.set("file", file);
        upload.set("proposalId", result.data.id);
        const r = await fetch("/api/upload", { method: "POST", body: upload });
        if (!r.ok) failed++;
      }
      router.push("/propuesta/" + result.data.id + (failed ? "?adjuntos=error" : ""));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo publicar.");
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <p className="eyebrow">{id ? "Editar propuesta" : "Nueva propuesta"}</p>
      <h1>{id ? "Mejora tu propuesta." : "Haz una propuesta que te interesaría."}</h1>
      <p className="muted">Cuenta qué te gustaría ver hecho, a quién beneficiaría y cómo podría empezar. Después podrás enviarla a los responsables del área.</p>
      <AuthGate action="publicar una propuesta">
        {forbidden ? (
          <Notice tone="error" message="No puedes editar esta propuesta." />
        ) : (
          <form className="card form-card" onSubmit={submit}>
            <label className="field">
              Título
              <input required minLength={8} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Ciclovía segura entre el metro y el parque" />
              <span className="hint">{title.length}/160 caracteres</span>
            </label>
            <label className="field">
              Descripción
              <textarea required minLength={30} maxLength={12000} rows={9} value={body} onChange={(e) => setBody(e.target.value)} placeholder="¿Qué propones? ¿Por qué es importante? ¿Qué haría falta para empezar?" />
            </label>
            <label className="field">
              Temática
              <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="" disabled>Elige una temática</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <fieldset className="field" style={{ border: 0, padding: 0, margin: "0 0 16px" }}>
              <legend style={{ fontWeight: 600, fontSize: "0.92rem" }}>Alcance</legend>
              <div className="segmented">
                <label><input type="radio" name="scope" checked={scope === "local"} onChange={() => setScope("local")} /> Ubicación específica</label>
                <label><input type="radio" name="scope" checked={scope === "nacional"} onChange={() => setScope("nacional")} /> Todo Panamá</label>
              </div>
            </fieldset>
            {scope === "local" && (
              <div style={{ marginBottom: 18 }}>
                <TerritorySelect value={territory} allLabel="Elige provincia o comarca" onChange={setTerritory} />
              </div>
            )}
            {!id && (
              <label className="field">
                Archivos de apoyo (opcional)
                <input type="file" name="files" accept="image/png,image/jpeg,image/webp,application/pdf" multiple />
                <span className="hint">Hasta 5 imágenes (PNG, JPEG, WebP) o PDF de 10 MB cada uno. <b>Serán visibles para cualquier persona</b> junto con tu propuesta.</span>
              </label>
            )}
            {id && <p className="hint">Para añadir o quitar archivos, usa la sección de archivos en la página de la propuesta.</p>}
            <label className="check">
              <input type="checkbox" required />
              <span>Entiendo que la propuesta y sus archivos serán públicos, y que la plataforma no la aprueba ni garantiza su ejecución. He leído los <Link href="/terminos">términos</Link>.</span>
            </label>
            <Notice tone="error" message={message} />
            <button className="button accent" disabled={busy || !loaded}>
              {busy ? "Guardando…" : id ? "Guardar cambios" : "Publicar propuesta"}
            </button>
          </form>
        )}
      </AuthGate>
    </div>
  );
}
