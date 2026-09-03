"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createQuoteAction } from "../actions";
import { initialNewQuoteState } from "../new-quote-state";
import { formatCents, parseEurosToCents } from "@/lib/quotes/money";
import styles from "./quote-form.module.css";

type Line = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};

const EMPTY_LINE: Line = { description: "", quantity: "1", unitPrice: "", taxRate: "21" };

/** Mirrors the server calculation so the professional sees the total as they type. */
function previewTotals(lines: Line[]) {
  let subtotal = 0;
  let tax = 0;

  for (const line of lines) {
    const unit = parseEurosToCents(line.unitPrice);
    const quantity = Number(line.quantity.replace(",", "."));
    const rate = Number(line.taxRate.replace(",", "."));

    if (unit === null || !Number.isFinite(quantity) || !Number.isFinite(rate)) {
      continue;
    }

    const lineTotal = Math.round((Math.round(quantity * 1000) * unit) / 1000);
    subtotal += lineTotal;
    tax += Math.round((lineTotal * Math.round(rate * 100)) / 10000);
  }

  return { subtotal, tax, total: subtotal + tax };
}

export function QuoteForm() {
  const [state, formAction, pending] = useActionState(createQuoteAction, initialNewQuoteState);
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  const totals = useMemo(() => previewTotals(lines), [lines]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  return (
    <form className={styles.form} action={formAction}>
      <input type="hidden" name="items" value={JSON.stringify(lines)} />

      <section className={styles.block}>
        <h2>Cliente</h2>
        <div className={styles.grid2}>
          <label>
            Nombre del cliente
            <input name="clientName" required maxLength={160} placeholder="Reformas Montalvo" />
          </label>
          <label>
            Correo del cliente <span>(opcional)</span>
            <input name="clientEmail" type="email" maxLength={254} placeholder="cliente@empresa.es" />
          </label>
        </div>
      </section>

      <section className={styles.block}>
        <h2>Presupuesto</h2>
        <div className={styles.grid2}>
          <label>
            Referencia
            <input name="reference" required maxLength={40} placeholder="PF-2026-001" />
          </label>
        </div>
        <label className={styles.full}>
          Notas <span>(opcional)</span>
          <textarea name="notes" rows={3} maxLength={2000} placeholder="Condiciones, plazos, garantías…" />
        </label>
      </section>

      <section className={styles.block}>
        <h2>Conceptos</h2>

        <div className={styles.lines}>
          {lines.map((line, index) => (
            <div className={styles.line} key={index}>
              <label className={styles.lineDescription}>
                Concepto
                <input
                  value={line.description}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                  required
                  maxLength={300}
                  placeholder="Instalación cuadro eléctrico"
                />
              </label>
              <label>
                Cantidad
                <input
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  inputMode="decimal"
                  required
                />
              </label>
              <label>
                Precio (€)
                <input
                  value={line.unitPrice}
                  onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                  inputMode="decimal"
                  required
                  placeholder="680,00"
                />
              </label>
              <label>
                IVA (%)
                <input
                  value={line.taxRate}
                  onChange={(e) => updateLine(index, { taxRate: e.target.value })}
                  inputMode="decimal"
                  required
                />
              </label>
              <button
                type="button"
                className={styles.removeLine}
                onClick={() => setLines((c) => c.filter((_, i) => i !== index))}
                disabled={lines.length === 1}
                aria-label={`Quitar concepto ${index + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className={styles.addLine}
          onClick={() => setLines((c) => [...c, { ...EMPTY_LINE }])}
        >
          <Plus size={16} /> Añadir concepto
        </button>
      </section>

      <section className={styles.totals}>
        <div>
          <span>Base imponible</span>
          <strong>{formatCents(totals.subtotal)}</strong>
        </div>
        <div>
          <span>IVA</span>
          <strong>{formatCents(totals.tax)}</strong>
        </div>
        <div className={styles.grandTotal}>
          <span>Total</span>
          <strong>{formatCents(totals.total)}</strong>
        </div>
      </section>

      {state.status === "error" ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear presupuesto"}
      </button>
    </form>
  );
}
