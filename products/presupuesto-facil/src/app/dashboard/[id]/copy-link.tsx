"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "../dashboard.module.css";

/**
 * The link is shown once, right after sharing. The token is never stored, so
 * leaving this screen without copying it means generating a new one.
 */
export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={styles.linkBox}>
      <div>
        <strong>Enlace para tu cliente</strong>
        <p>Cópialo ahora: por seguridad no se guarda y no podrás volver a verlo.</p>
      </div>
      <div className={styles.linkRow}>
        <input readOnly value={link} aria-label="Enlace público del presupuesto" />
        <button type="button" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </section>
  );
}
