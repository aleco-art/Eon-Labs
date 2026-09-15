"use client";
import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { browserDb } from "@/lib/supabase/client";
import { photoLimit, photoUrl } from "@/lib/domain";
import { validateFile } from "@/lib/files";
import { ReportButton } from "./common";

type Photo = { id: string; name: string; path: string };

/** Photos of the proposal: a large view with thumbnails; the author adds and removes them. */
export function Photos({ proposalId, photos, isAuthor, userId, onChange, onMessage }: {
  proposalId: string;
  photos: Photo[];
  isAuthor: boolean;
  userId?: string;
  onChange: () => Promise<void>;
  onMessage: (text: string, tone: "ok" | "error") => void;
}) {
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  if (!photos.length && !isAuthor) return null;
  const current = photos[Math.min(active, photos.length - 1)];

  async function add(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, photoLimit - photos.length);
    if (!files.length) return;
    setBusy(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) throw new Error("Las fotos deben ser PNG, JPEG o WebP.");
        await validateFile(file);
        const form = new FormData();
        form.set("file", file);
        form.set("kind", "foto");
        form.set("proposalId", proposalId);
        const r = await fetch("/api/upload", { method: "POST", body: form });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
      }
      onMessage(files.length === 1 ? "Foto añadida. Es visible para cualquier persona." : "Fotos añadidas. Son visibles para cualquier persona.", "ok");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "No se pudo subir la foto.", "error");
    } finally {
      setBusy(false);
      await onChange();
    }
  }

  async function remove(photo: Photo) {
    const db = browserDb();
    const { error } = await db.from("attachments").delete().eq("id", photo.id).eq("owner_id", userId!);
    if (!error) await db.storage.from("proposal-files").remove([photo.path]);
    onMessage(error ? "No se pudo quitar la foto." : "Foto quitada.", error ? "error" : "ok");
    setActive(0);
    await onChange();
  }

  return (
    <section className="photos" aria-label="Fotos de la propuesta">
      {current && (
        <a className="photo-main" href={photoUrl(current.id)} target="_blank" rel="noreferrer" title="Ver la foto completa">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(current.id)} alt={current.name} />
        </a>
      )}
      {(photos.length > 1 || isAuthor) && (
        <div className="photo-strip">
          {photos.map((p, i) => (
            <div className="photo-thumb" key={p.id}>
              <button type="button" aria-label={`Ver foto ${i + 1}`} aria-pressed={p.id === current?.id} onClick={() => setActive(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(p.id)} alt="" loading="lazy" />
              </button>
              {isAuthor ? (
                <button type="button" className="photo-remove" aria-label={`Quitar foto ${i + 1}`} onClick={() => remove(p)}><X size={14} /></button>
              ) : (
                i === active && <ReportButton target={{ proposalId, attachmentId: p.id }} label="" />
              )}
            </div>
          ))}
          {isAuthor && photos.length < photoLimit && (
            <label className={"photo-add" + (busy ? " busy" : "")}>
              <ImagePlus size={20} aria-hidden="true" />
              <span>{busy ? "Subiendo…" : photos.length ? "Añadir" : "Añadir fotos"}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      )}
    </section>
  );
}
