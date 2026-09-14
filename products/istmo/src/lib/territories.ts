"use client";
import { useEffect, useState } from "react";

export type Territory = {
  code: string;
  name: string;
  province_code: string;
  province: string;
  district_code: string;
  district: string;
  aliases: string[];
};

let pending: Promise<Territory[]> | null = null;
let cache: Territory[] | null = null;

function load() {
  pending ??= fetch("/api/territorios")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("territorios"))))
    .then((rows: Territory[]) => (cache = rows))
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

/** Territories loaded once per page from the database-backed endpoint and shared by all components. */
export function useTerritories() {
  const [rows, setRows] = useState<Territory[] | null>(cache);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    load().then(
      (r) => alive && setRows(r),
      () => alive && setError(true),
    );
    return () => {
      alive = false;
    };
  }, []);
  return { territories: rows, error };
}

export function placeLabel(
  rows: Territory[] | null,
  province: string | null,
  district?: string | null,
  corregimiento?: string | null,
) {
  if (!province) return "Todo Panamá";
  if (!rows) return "…";
  if (corregimiento) {
    const t = rows.find((r) => r.code === corregimiento);
    if (t) return `${t.name}, ${t.district}`;
  }
  if (district) {
    const t = rows.find((r) => r.district_code === district);
    if (t) return `${t.district}, ${t.province}`;
  }
  return rows.find((r) => r.province_code === province)?.province ?? "Panamá";
}
