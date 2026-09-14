"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate, Notice, TerritorySelect } from "./common";
import { useSession } from "./shell";
import { browserDb } from "@/lib/supabase/client";
import { categories } from "@/lib/domain";
import { validateFile } from "@/lib/files";
export function ProposalForm({ id }: { id?: string }) {
  const { user } = useSession();
  const router = useRouter();
  const [territory, setTerritory] = useState({
    province: "",
    district: "",
    corregimiento: "",
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>(categories[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  useEffect(() => {
    if (!id || !user) return;
    browserDb()
      .from("proposals")
      .select("*")
      .eq("id", id)
      .eq("author_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setMessage("No puedes editar esta propuesta.");
          return;
        }
        setTitle(data.title);
        setBody(data.body);
        setCategory(data.category);
        setTerritory({
          province: data.province ?? "",
          district: data.district ?? "",
          corregimiento: data.corregimiento ?? "",
        });
        setLoaded(true);
      });
  }, [id, user]);
  return (
    <div className="narrow-page">
      <p className="eyebrow">UNA IDEA PUEDE ABRIR CAMINO</p>
      <h1>
        {id ? "Dale forma a tu propuesta." : "¿Qué te gustaría hacer posible?"}
      </h1>
      <p className="muted">
        Cuenta qué propones, por qué importa y cómo podría empezar.
      </p>
      <AuthGate>
        <Notice message={message} />
        <form
          className="form-card"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return;
            setBusy(true);
            setMessage("");
            const form = e.currentTarget;
            try {
              const files = (
                new FormData(form).getAll("files") as File[]
              ).filter((f) => f.size);
              if (files.length > 5)
                throw new Error(
                  "Puedes adjuntar hasta 5 archivos por publicación.",
                );
              for (const f of files) await validateFile(f);
              const db = browserDb();
              const payload = {
                title: title.trim(),
                body: body.trim(),
                category,
                province: territory.province || null,
                district: territory.district || null,
                corregimiento: territory.corregimiento || null,
              };
              const result = id
                ? await db
                    .from("proposals")
                    .update(payload)
                    .eq("id", id)
                    .eq("author_id", user.id)
                    .select("id")
                    .single()
                : await db
                    .from("proposals")
                    .insert({ ...payload, author_id: user.id })
                    .select("id")
                    .single();
              if (result.error)
                throw new Error(
                  "No se pudo guardar la propuesta. Revisa los campos y vuelve a intentarlo.",
                );
              const proposalId = result.data.id;
              let uploadFailed = false;
              for (const file of files) {
                const upload = new FormData();
                upload.set("file", file);
                upload.set("proposalId", proposalId);
                const r = await fetch("/api/upload", {
                  method: "POST",
                  body: upload,
                });
                if (!r.ok) uploadFailed = true;
              }
              router.push(
                "/propuesta/" +
                  proposalId +
                  (uploadFailed ? "?adjuntos=error" : ""),
              );
            } catch (err) {
              setMessage(
                err instanceof Error ? err.message : "No se pudo publicar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Título
            <input
              required
              minLength={8}
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Una idea concreta, en pocas palabras"
            />
            <small>{title.length}/160 caracteres</small>
          </label>
          <label>
            Tu propuesta
            <textarea
              required
              minLength={30}
              maxLength={12000}
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="¿Qué propones? ¿A quién beneficiaría? ¿Qué haría falta para comenzar?"
            />
          </label>
          <label>
            Temática
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <p className="eyebrow">¿DÓNDE PODRÍA PASAR?</p>
          <TerritorySelect value={territory} onChange={setTerritory} />
          <label style={{ marginTop: 24 }}>
            Archivos de apoyo <span className="muted">(opcional)</span>
            <input
              type="file"
              name="files"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              multiple
            />
            <small>
              Hasta 5 imágenes o PDF de 10 MB cada uno. Los adjuntos serán
              públicos junto con tu propuesta.
            </small>
          </label>
          <label className="checkbox">
            <input type="checkbox" required />
            <span>
              He revisado que el texto y los archivos pueden compartirse
              públicamente.
            </span>
          </label>
          <button className="button primary" disabled={busy || !loaded}>
            {busy
              ? "Guardando…"
              : id
                ? "Guardar cambios"
                : "Publicar propuesta"}
          </button>
        </form>
      </AuthGate>
    </div>
  );
}
