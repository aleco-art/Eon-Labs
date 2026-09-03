import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Send, XCircle } from "lucide-react";
import { shareQuoteAction } from "../actions";
import { CopyLink } from "./copy-link";
import { formatCents } from "@/lib/quotes/money";
import { getQuote, type QuoteStatus } from "@/lib/quotes/repository";
import { requireOwnerEmail } from "@/lib/session";
import styles from "../dashboard.module.css";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Borrador",
  shared: "Compartido",
  viewed: "Visto por el cliente",
  accepted: "Aceptado",
  rejected: "Rechazado",
  expired: "Caducado",
};

const EVENT_LABEL: Record<string, string> = {
  created: "Creado",
  shared: "Compartido",
  viewed: "Visto por el cliente",
  accepted: "Aceptado por el cliente",
  rejected: "Rechazado por el cliente",
  expired: "Caducado",
  revoked: "Revocado",
};

const stamp = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const quantityFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 });

function statusClass(status: QuoteStatus) {
  if (status === "accepted") return styles.badgeOk;
  if (status === "rejected") return styles.badgeNo;
  if (status === "draft") return styles.badgeMuted;
  return styles.badgeInfo;
}

export default async function QuoteDetailPage(props: PageProps<"/dashboard/[id]">) {
  const email = await requireOwnerEmail();
  const { id } = await props.params;
  const search = await props.searchParams;
  const quote = await getQuote(email, id);

  if (!quote) {
    notFound();
  }

  const freshLink = Array.isArray(search.enlace) ? search.enlace[0] : search.enlace;
  const answered = quote.status === "accepted" || quote.status === "rejected";

  return (
    <>
      <div className={styles.heading}>
        <div>
          <Link className={styles.backLink} href="/dashboard">
            <ArrowLeft size={15} /> Volver
          </Link>
          <h1>{quote.reference}</h1>
          <p>Para {quote.clientName}</p>
        </div>
        <span className={statusClass(quote.status)}>{STATUS_LABEL[quote.status]}</span>
      </div>

      {answered ? (
        <section className={quote.status === "accepted" ? styles.answeredOk : styles.answeredNo}>
          {quote.status === "accepted" ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          <div>
            <strong>
              {quote.status === "accepted"
                ? "El cliente aceptó el presupuesto"
                : "El cliente rechazó el presupuesto"}
            </strong>
            {quote.respondedAt ? (
              <small>{stamp.format(new Date(quote.respondedAt))}</small>
            ) : null}
            {quote.responseComment ? <p>“{quote.responseComment}”</p> : null}
          </div>
        </section>
      ) : (
        <section className={styles.shareBox}>
          <div>
            <strong>{quote.isShared ? "Enlace activo" : "Comparte con tu cliente"}</strong>
            <p>
              {quote.isShared
                ? "El cliente puede abrirlo y responder. Genera uno nuevo si lo perdiste."
                : "Se genera un enlace público y seguro que caduca en 30 días."}
            </p>
          </div>
          <form action={shareQuoteAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <button type="submit">
              <Send size={16} /> {quote.isShared ? "Generar enlace nuevo" : "Compartir"}
            </button>
          </form>
        </section>
      )}

      {freshLink ? <CopyLink link={freshLink} /> : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Concepto</th>
              <th scope="col">Cantidad</th>
              <th scope="col">Precio</th>
              <th scope="col">IVA</th>
              <th scope="col">Importe</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr key={`${item.description}-${index}`}>
                <td>{item.description}</td>
                <td className={styles.numeric}>{quantityFormatter.format(item.quantity)}</td>
                <td className={styles.numeric}>{formatCents(item.unitPriceCents)}</td>
                <td className={styles.numeric}>{quantityFormatter.format(item.taxRate)} %</td>
                <td className={styles.numeric}>{formatCents(item.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className={styles.detailTotals}>
        <div>
          <dt>Base imponible</dt>
          <dd>{formatCents(quote.subtotalCents)}</dd>
        </div>
        <div>
          <dt>IVA</dt>
          <dd>{formatCents(quote.taxCents)}</dd>
        </div>
        <div className={styles.grandTotalRow}>
          <dt>Total</dt>
          <dd>{formatCents(quote.totalCents)}</dd>
        </div>
      </dl>

      {quote.notes ? (
        <section className={styles.notesBox}>
          <h2>Notas</h2>
          <p>{quote.notes}</p>
        </section>
      ) : null}

      <section className={styles.timeline}>
        <h2>Historial</h2>
        <ol>
          {quote.events.map((event, index) => (
            <li key={`${event.type}-${index}`}>
              <span>{EVENT_LABEL[event.type] ?? event.type}</span>
              <small>{stamp.format(new Date(event.occurredAt))}</small>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
