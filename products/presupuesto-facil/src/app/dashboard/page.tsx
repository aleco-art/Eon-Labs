import Link from "next/link";
import { FilePlus2, FileText } from "lucide-react";
import { formatCents } from "@/lib/quotes/money";
import { listQuotes, type QuoteStatus } from "@/lib/quotes/repository";
import { requireOwnerEmail } from "@/lib/session";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Borrador",
  shared: "Compartido",
  viewed: "Visto",
  accepted: "Aceptado",
  rejected: "Rechazado",
  expired: "Caducado",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function statusClass(status: QuoteStatus) {
  if (status === "accepted") return styles.badgeOk;
  if (status === "rejected") return styles.badgeNo;
  if (status === "draft") return styles.badgeMuted;
  return styles.badgeInfo;
}

export default async function DashboardPage() {
  const email = await requireOwnerEmail();
  const quotes = await listQuotes(email);

  const waiting = quotes.filter((q) => q.status === "shared" || q.status === "viewed").length;
  const accepted = quotes.filter((q) => q.status === "accepted").length;
  const rejected = quotes.filter((q) => q.status === "rejected").length;

  return (
    <>
      <div className={styles.heading}>
        <div>
          <p>Tus presupuestos</p>
          <h1>Resumen</h1>
        </div>
        <Link className={styles.primaryLink} href="/dashboard/nuevo">
          <FilePlus2 size={18} /> Nuevo presupuesto
        </Link>
      </div>

      <section className={styles.metrics} aria-label="Estado de presupuestos">
        <article>
          <span>Esperando respuesta</span>
          <strong>{waiting}</strong>
          <small>Compartidos y vistos</small>
        </article>
        <article>
          <span>Aceptados</span>
          <strong>{accepted}</strong>
          <small>Confirmados por el cliente</small>
        </article>
        <article>
          <span>Rechazados</span>
          <strong>{rejected}</strong>
          <small>Con o sin comentario</small>
        </article>
      </section>

      {quotes.length === 0 ? (
        <section className={styles.empty}>
          <div className={styles.emptyIcon}>
            <FileText size={24} />
          </div>
          <h2>Aún no hay presupuestos</h2>
          <p>Crea el primero y compártelo con tu cliente en menos de cinco minutos.</p>
        </section>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Referencia</th>
                <th scope="col">Cliente</th>
                <th scope="col">Estado</th>
                <th scope="col">Total</th>
                <th scope="col">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td>
                    <Link className={styles.rowLink} href={`/dashboard/${quote.id}`}>
                      {quote.reference}
                    </Link>
                  </td>
                  <td>{quote.clientName}</td>
                  <td>
                    <span className={statusClass(quote.status)}>
                      {STATUS_LABEL[quote.status]}
                    </span>
                  </td>
                  <td className={styles.numeric}>{formatCents(quote.totalCents)}</td>
                  <td className={styles.muted}>
                    {dateFormatter.format(new Date(quote.updatedAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
