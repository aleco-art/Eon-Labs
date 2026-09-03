import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { formatCents } from "@/lib/quotes/money";
import { fetchSharedQuote } from "@/lib/quotes/repository";
import { respondToQuote } from "./actions";
import { QuoteResponse } from "./quote-response";
import styles from "./shared-quote.module.css";

/**
 * The customer's view. An invalid, expired or revoked token is indistinguishable
 * from one that never existed: the database function returns nothing and this
 * renders the same not found page either way.
 */

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const quantityFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 3,
});

export default async function SharedQuotePage(props: PageProps<"/p/[token]">) {
  const { token } = await props.params;
  const quote = await fetchSharedQuote(token);

  if (!quote) {
    notFound();
  }

  const answered = quote.status === "accepted" || quote.status === "rejected";

  return (
    <main className={styles.page}>
      <article className={styles.sheet}>
        <header className={styles.head}>
          <div>
            <span>Presupuesto</span>
            <h1>{quote.reference}</h1>
          </div>
          <div className={styles.issuer}>
            <span>De</span>
            <strong>{quote.businessName ?? "Profesional"}</strong>
          </div>
        </header>

        <p className={styles.recipient}>
          Para <strong>{quote.clientName}</strong>
        </p>

        <div className={styles.tableWrap}>
          <table className={styles.items}>
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
                  <td>{quantityFormatter.format(item.quantity)}</td>
                  <td>{formatCents(item.unitPriceCents)}</td>
                  <td>{quantityFormatter.format(item.taxRate)} %</td>
                  <td>{formatCents(item.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className={styles.totals}>
          <div>
            <dt>Base imponible</dt>
            <dd>{formatCents(quote.subtotalCents)}</dd>
          </div>
          <div>
            <dt>IVA</dt>
            <dd>{formatCents(quote.taxCents)}</dd>
          </div>
          <div className={styles.grandTotal}>
            <dt>Total</dt>
            <dd>{formatCents(quote.totalCents)}</dd>
          </div>
        </dl>

        {quote.notes ? (
          <section className={styles.notes}>
            <h2>Notas</h2>
            <p>{quote.notes}</p>
          </section>
        ) : null}

        <p className={styles.validity}>
          Este enlace caduca el {dateFormatter.format(new Date(quote.expiresAt))}.
        </p>
      </article>

      {answered ? (
        <aside
          className={quote.status === "accepted" ? styles.answeredOk : styles.answeredNo}
          role="status"
        >
          {quote.status === "accepted" ? (
            <CheckCircle2 size={22} aria-hidden="true" />
          ) : (
            <XCircle size={22} aria-hidden="true" />
          )}
          <div>
            <strong>
              {quote.status === "accepted"
                ? "Presupuesto aceptado"
                : "Presupuesto rechazado"}
            </strong>
            {quote.responseComment ? <p>{quote.responseComment}</p> : null}
          </div>
        </aside>
      ) : (
        <QuoteResponse action={respondToQuote.bind(null, token)} />
      )}
    </main>
  );
}
