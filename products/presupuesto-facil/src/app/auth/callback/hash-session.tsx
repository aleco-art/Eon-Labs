"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Finishes an implicit-flow link. The tokens arrive in the URL fragment, which
 * the browser never sends to the server, so the exchange has to happen here.
 * A full navigation follows so the server sees the fresh session cookies.
 */
export function HashSession() {
  useEffect(() => {
    const fragment = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(fragment);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      window.location.replace("/?access=invalid");
      return;
    }

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        window.location.replace(error ? "/?access=invalid" : "/dashboard");
      })
      .catch(() => {
        window.location.replace("/?access=invalid");
      });
  }, []);

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "60vh", padding: 24 }}>
      <p>Comprobando el enlace de acceso…</p>
    </main>
  );
}
