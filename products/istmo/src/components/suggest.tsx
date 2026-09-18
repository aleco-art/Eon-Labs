"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
import { categories, dateLabel } from "@/lib/domain";
import { useTerritories } from "@/lib/territories";
import { Notice } from "./common";
import { useSession } from "./shell";

const entityTypes = [
  "Municipio",
  "Junta comunal",
  "Ministerio",
  "Entidad nacional",
  "Entidad nacional · oficina regional",
  "Gremio u organización",
  "Otra",
];

type Mine = { id: string; name: string; status: "pendiente" | "aceptada" | "rechazada"; review_note: string | null; created_at: string };

const statusLabel: Record<Mine["status"], string> = {
  pendiente: "En revisión",
  aceptada: "Publicada en el directorio",
  rechazada: "No publicada",
};

/** Lets people add a responsable the directory is missing; moderation checks it before it is public. */
export function SuggestResponsable() {
  const { user, ready } = useSession();
  const { territories } = useTerritories();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<"nacional" | "provincial" | "distrital">("distrital");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [mine, setMine] = useState<Mine[]>([]);

  const provinces = useMemo(
    () => [...new Map((territories ?? []).map((t) => [t.province_code, t.province])).entries()],
    [territories],
  );
  const districts = useMemo(
    () =>
      [...new Map((territories ?? []).filter((t) => t.province_code === province).map((t) => [t.district_code, t.district])).entries()].sort(
        (a, b) => a[1].localeCompare(b[1], "es"),
      ),
    [territories, province],
  );

  const load = useCallback(async () => {
    if (!configured || !user) return;
    const { data } = await browserDb()
      .from("responsable_suggestions")
      .select("id,name,status,review_note,created_at")
      .eq("suggested_by", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setMine((data as Mine[]) ?? []);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim() || null;
    const email = text("email");
    const contactUrl = text("contact_url");
    if (!email && !contactUrl) return setMessage({ text: "Indica un correo o una página de contacto.", tone: "error" });
    if (!areas.length) return setMessage({ text: "Marca al menos un área.", tone: "error" });
    if (level !== "nacional" && !province) return setMessage({ text: "Elige la provincia.", tone: "error" });
    if (level === "distrital" && !district) return setMessage({ text: "Elige el distrito.", tone: "error" });
    setSaving(true);
    setMessage(null);
    const form = e.currentTarget;
    const { error } = await browserDb().from("responsable_suggestions").insert({
      suggested_by: user.id,
      name: text("name"),
      entity_type: text("entity_type"),
      role_title: text("role_title"),
      person_name: text("person_name"),
      email: email?.toLowerCase() ?? null,
      contact_url: contactUrl,
      phone: text("phone"),
      areas,
      level,
      province_code: level === "nacional" ? null : province,
      district_code: level === "distrital" ? district : null,
      competence: text("competence"),
      source_url: text("source_url"),
      note: text("note"),
    });
    setSaving(false);
    if (error) {
      const why = /check constraint/.test(error.message)
        ? "Revisa los datos: el correo, el teléfono o los enlaces no tienen un formato válido."
        : /límite/.test(error.message)
          ? error.message
          : "No se pudo enviar la sugerencia.";
      return setMessage({ text: why, tone: "error" });
    }
    form.reset();
    setAreas([]);
    setOpen(false);
    setMessage({ text: "¡Gracias! Lo revisaremos antes de publicarlo en el directorio.", tone: "ok" });
    await load();
  }

  return (
    <div className="card suggest" id="sugerir">
      <div className="suggest-head">
        <Lightbulb size={22} aria-hidden="true" />
        <div>
          <b>¿Falta alguien?</b>
          <p className="muted" style={{ margin: 0 }}>
            Si conoces una oficina o responsable con correo o canal de contacto publicado, sugiérelo. Moderación revisa la
            fuente antes de publicarlo.
          </p>
        </div>
        {ready && !user ? (
          <Link className="button secondary small" href="/cuenta">Inicia sesión para sugerir</Link>
        ) : (
          !open && (
            <button className="button secondary small" onClick={() => setOpen(true)}>
              Sugerir un responsable
            </button>
          )
        )}
      </div>
      {message && <Notice tone={message.tone} message={message.text} />}

      {open && user && (
        <form className="suggest-form" onSubmit={submit}>
          <div className="suggest-grid">
            <label className="field">
              Entidad u oficina
              <input name="name" required minLength={3} maxLength={160} placeholder="Ej.: Junta Comunal de Bella Vista" />
            </label>
            <label className="field">
              Tipo
              <select name="entity_type" required defaultValue="">
                <option value="" disabled>Elige una opción</option>
                {entityTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="field">
              Cargo (opcional)
              <input name="role_title" maxLength={160} placeholder="Ej.: Representante de corregimiento" />
            </label>
            <label className="field">
              Nombre de la persona (opcional)
              <input name="person_name" maxLength={120} />
            </label>
            <label className="field">
              Correo publicado
              <input name="email" type="email" maxLength={254} placeholder="Solo correos públicos e institucionales" />
            </label>
            <label className="field">
              Página o formulario de contacto
              <input name="contact_url" type="url" maxLength={300} placeholder="https://" />
            </label>
            <label className="field">
              Teléfono (opcional)
              <input name="phone" maxLength={20} placeholder="+507 …" />
            </label>
            <label className="field">
              Alcance
              <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
                <option value="distrital">Municipal o de corregimiento</option>
                <option value="provincial">Provincial o regional</option>
                <option value="nacional">Nacional</option>
              </select>
            </label>
            {level !== "nacional" && (
              <label className="field">
                Provincia o comarca
                <select value={province} onChange={(e) => { setProvince(e.target.value); setDistrict(""); }}>
                  <option value="">Elige una provincia</option>
                  {provinces.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </label>
            )}
            {level === "distrital" && (
              <label className="field">
                Distrito
                <select value={district} disabled={!province} onChange={(e) => setDistrict(e.target.value)}>
                  <option value="">Elige un distrito</option>
                  {districts.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </label>
            )}
          </div>
          <fieldset className="suggest-areas">
            <legend>Áreas que atiende</legend>
            {categories.map((c) => (
              <label className="check" key={c}>
                <input
                  type="checkbox"
                  checked={areas.includes(c)}
                  onChange={(e) => setAreas(e.target.checked ? [...areas, c] : areas.filter((a) => a !== c))}
                />
                <span>{c}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            ¿Qué atiende?
            <textarea name="competence" required minLength={10} maxLength={500} rows={3} placeholder="Ej.: Aseo, alumbrado y parques del corregimiento; recibe solicitudes de la comunidad." />
          </label>
          <label className="field">
            ¿Dónde aparece publicado este contacto?
            <input name="source_url" type="url" required maxLength={300} placeholder="Enlace a la página oficial o pública donde lo viste" />
            <span className="hint">Sin fuente no podemos publicarlo. Preferimos páginas oficiales (.gob.pa).</span>
          </label>
          <label className="field">
            Nota para moderación (opcional)
            <textarea name="note" maxLength={500} rows={2} />
          </label>
          <div className="toolbar">
            <button className="button accent" disabled={saving}>{saving ? "Enviando…" : "Enviar sugerencia"}</button>
            <button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {mine.length > 0 && (
        <div className="suggest-mine">
          <p className="eyebrow" style={{ margin: "14px 0 6px" }}>Tus sugerencias</p>
          <ul>
            {mine.map((m) => (
              <li key={m.id}>
                <b>{m.name}</b> · {dateLabel(m.created_at)} ·{" "}
                <span className={"suggest-status " + m.status}>{statusLabel[m.status]}</span>
                {m.status === "rechazada" && m.review_note && <span className="muted"> — {m.review_note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
