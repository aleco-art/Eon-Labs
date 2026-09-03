import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuoteForm } from "./quote-form";
import styles from "../dashboard.module.css";

export const dynamic = "force-dynamic";

export default function NewQuotePage() {
  return (
    <>
      <div className={styles.heading}>
        <div>
          <Link className={styles.backLink} href="/dashboard">
            <ArrowLeft size={15} /> Volver
          </Link>
          <h1>Nuevo presupuesto</h1>
        </div>
      </div>

      <QuoteForm />
    </>
  );
}
