"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { browserDb } from "@/lib/supabase/client";
import { useTerritories } from "@/lib/territories";
import { useSession } from "./shell";

export type TerritoryValue = { province: string; district: string; corregimiento: string };
export const emptyTerritory: TerritoryValue = { province: "", district: "", corregimiento: "" };

export function TerritorySelect({
  value,
  onChange,
  allLabel = "Todo Panamá",
}: {
  value: TerritoryValue;
  onChange: (v: TerritoryValue) => void;
  allLabel?: string;
}) {
  const { territories, error } = useTerritories();
  const uid = useId();
  if (error) return <Notice tone="error" message="No se pudo cargar la división territorial. Recarga la página." />;
  if (!territories) return <p className="muted">Cargando provincias, distritos y corregimientos…</p>;
  const unique = <T extends { code: string }>(rows: T[]) => [...new Map(rows.map((r) => [r.code, r])).values()];
  const provinces = unique(territories.map((t) => ({ code: t.province_code, name: t.province })));
  const districts = unique(
    territories.filter((t) => t.province_code === value.province).map((t) => ({ code: t.district_code, name: t.district })),
  ).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const corregimientos = territories
    .filter((t) => t.district_code === value.district)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return (
    <div className="territory">
      <div>
        <label htmlFor={uid + "p"}>Provincia o comarca</label>
        <select id={uid + "p"} value={value.province} onChange={(e) => onChange({ province: e.target.value, district: "", corregimiento: "" })}>
          <option value="">{allLabel}</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={uid + "d"}>Distrito</label>
        <select id={uid + "d"} disabled={!value.province} value={value.district} onChange={(e) => onChange({ ...value, district: e.target.value, corregimiento: "" })}>
          <option value="">{value.province ? "Toda la provincia o comarca" : "Elige una provincia"}</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={uid + "c"}>Corregimiento</label>
        <select id={uid + "c"} disabled={!value.district} value={value.corregimiento} onChange={(e) => onChange({ ...value, corregimiento: e.target.value })}>
          <option value="">{value.district ? "Todo el distrito" : "Elige un distrito"}</option>
          {corregimientos.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
              {t.aliases.length > 0 && !t.aliases.every((a) => t.name.includes(a)) ? ` (también: ${t.aliases.filter((a) => !t.name.includes(a)).join(", ")})` : ""}
            </option>
          ))}
        </select>
      </div>
      {(value.province === "10" || value.district === "0105") && (
        <p className="hint" style={{ gridColumn: "1 / -1" }}>
          La cartografía oficial representa esta comarca de forma particular. <Link href="/fuentes">Ver cobertura y limitaciones</Link>.
        </p>
      )}
    </div>
  );
}

export function Notice({ message, tone = "info" }: { message: string; tone?: "info" | "warn" | "error" | "ok" }) {
  if (!message) return null;
  return (
    <div className={"notice " + (tone === "info" ? "" : tone)} role={tone === "error" ? "alert" : "status"}>
      {message}
    </div>
  );
}

export function AuthGate({ children, action = "participar" }: { children: React.ReactNode; action?: string }) {
  const { user, ready } = useSession();
  if (!ready) return <p className="loading">Cargando tu sesión…</p>;
  if (!user)
    return (
      <div className="empty">
        <h2>Necesitas una cuenta para {action}.</h2>
        <p>Puedes explorar sin iniciar sesión. Para publicar, comentar, apoyar o enviar propuestas, entra con tu cuenta.</p>
        <Link className="button primary" href="/cuenta">Entrar o crear cuenta</Link>
      </div>
    );
  return <>{children}</>;
}

type ReportTarget = { proposalId?: string; commentId?: string; attachmentId?: string; responsableId?: string };

export function ReportButton({ target, label = "Reportar" }: { target: ReportTarget; label?: string }) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const dataError = Boolean(target.responsableId);
  return (
    <span>
      <button className="text-button" style={{ color: "var(--muted)" }} onClick={() => setOpen(!open)} aria-expanded={open}>
        <Flag size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> {label}
      </button>
      {open && (
        <form
          className="subpanel"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return setMessage({ text: "Inicia sesión para enviar un reporte.", tone: "error" });
            const { error } = await browserDb().from("reports").insert({
              reporter_id: user.id,
              proposal_id: target.proposalId ?? null,
              comment_id: target.commentId ?? null,
              attachment_id: target.attachmentId ?? null,
              responsable_id: target.responsableId ?? null,
              kind: dataError ? "dato_incorrecto" : "contenido",
              reason,
            });
            if (error) setMessage({ text: error.code === "P0001" ? error.message : "No se pudo registrar el reporte.", tone: "error" });
            else {
              setMessage({ text: "Gracias. El equipo de moderación lo revisará.", tone: "ok" });
              setOpen(false);
              setReason("");
            }
          }}
        >
          <label className="field">
            {dataError ? "¿Qué dato es incorrecto?" : "¿Por qué reportas este contenido? (spam, abuso, archivo inapropiado…)"}
            <textarea required minLength={5} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} style={{ minHeight: 80 }} />
          </label>
          <button className="button secondary small">Enviar reporte</button>
        </form>
      )}
      {message && <Notice message={message.text} tone={message.tone} />}
    </span>
  );
}
