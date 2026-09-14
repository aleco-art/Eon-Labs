"use client";
import { useState } from "react";
import territories from "@/data/territories.json";
import { browserDb } from "@/lib/supabase/client";
import { useSession } from "./shell";
import Link from "next/link";
export const provinces = [
  ...new Map(
    territories.map((t) => [
      t.province_code,
      { code: t.province_code, name: t.province },
    ]),
  ).values(),
];
export function locationLabel(
  province: string | null,
  district?: string | null,
  corregimiento?: string | null,
) {
  const t = territories.find((t) =>
    corregimiento
      ? t.code === corregimiento
      : district
        ? t.district_code === district
        : t.province_code === province,
  );
  return t
    ? corregimiento
      ? t.name
      : district
        ? t.district
        : t.province
    : "Todo Panamá";
}
export function TerritorySelect({
  value,
  onChange,
}: {
  value: { province: string; district: string; corregimiento: string };
  onChange: (v: {
    province: string;
    district: string;
    corregimiento: string;
  }) => void;
}) {
  const districts = [
    ...new Map(
      territories
        .filter((t) => t.province_code === value.province)
        .map((t) => [
          t.district_code,
          { code: t.district_code, name: t.district },
        ]),
    ).values(),
  ];
  return (
    <div className="territory-select">
      <label>
        Provincia o comarca
        <select
          value={value.province}
          onChange={(e) =>
            onChange({
              province: e.target.value,
              district: "",
              corregimiento: "",
            })
          }
        >
          <option value="">Todo Panamá</option>
          {provinces.map((p) => (
            <option value={p.code} key={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {value.province && (
        <label>
          {value.province === "10" ? "Agrupación territorial" : "Distrito"}
          <select
            value={value.district}
            onChange={(e) =>
              onChange({
                ...value,
                district: e.target.value,
                corregimiento: "",
              })
            }
          >
            <option value="">Toda la provincia o comarca</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {value.district && (
        <label>
          Corregimiento
          <select
            value={value.corregimiento}
            onChange={(e) =>
              onChange({ ...value, corregimiento: e.target.value })
            }
          >
            <option value="">Todo el distrito o agrupación</option>
            {territories
              .filter((t) => t.district_code === value.district)
              .map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>
      )}
      {(value.province === "10" || value.district === "0105") && (
        <p className="muted">
          Esta comarca tiene particularidades en la cartografía de origen.{" "}
          <Link href="/fuentes">Consultar cobertura.</Link>
        </p>
      )}
    </div>
  );
}
export function Notice({ message }: { message: string }) {
  return message ? (
    <div className="notice" role="status">
      {message}
    </div>
  ) : null;
}
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession();
  return !ready ? (
    <p className="muted">Cargando tu cuenta…</p>
  ) : !user ? (
    <div className="empty-state">
      <h2>Tu voz necesita un nombre.</h2>
      <p>Inicia sesión para participar y conservar tus propuestas.</p>
      <Link className="button primary" href="/cuenta">
        Entrar o crear cuenta
      </Link>
    </div>
  ) : (
    children
  );
}
export function Report({
  proposalId,
  commentId,
}: {
  proposalId: string;
  commentId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const { user } = useSession();
  return (
    <>
      <button className="text-button muted" onClick={() => setOpen(!open)}>
        Reportar
      </button>
      {open && (
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) {
              setMessage("Inicia sesión para reportar contenido.");
              return;
            }
            const { error } = await browserDb()
              .from("reports")
              .insert({
                proposal_id: proposalId,
                comment_id: commentId ?? null,
                reporter_id: user.id,
                reason,
              });
            setMessage(
              error
                ? "No se pudo registrar el reporte."
                : "Reporte recibido para moderación.",
            );
            if (!error) setOpen(false);
          }}
        >
          <label>
            Motivo del reporte
            <textarea
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>
          <button className="button secondary">Enviar reporte</button>
        </form>
      )}
      <Notice message={message} />
    </>
  );
}
