import Image from "next/image";
import Link from "next/link";
import { Check, FileText, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import styles from "./page.module.css";

const items = [
  { concept: "Instalación cuadro eléctrico", quantity: "1", amount: "680,00 €" },
  { concept: "Puntos de luz", quantity: "8", amount: "360,00 €" },
  { concept: "Revisión y certificado", quantity: "1", amount: "145,00 €" },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Presupuesto Fácil">
          <Image className={styles.mark} src="/eon-mark.svg" alt="" width={38} height={38} priority />
          <span>
            <strong>Presupuesto Fácil</strong>
            <small>by Eon Labs</small>
          </span>
        </Link>
        <span className={styles.secure}><ShieldCheck size={17} /> Área profesional</span>
      </header>

      <section className={styles.workspace}>
        <div className={styles.access}>
          <div className={styles.eyebrow}><FileText size={16} /> Acceso interno</div>
          <h1>Tus presupuestos,<br />sin papeleo.</h1>
          <p className={styles.intro}>Entra para crear, compartir y seguir cada presupuesto desde un único lugar.</p>

          <LoginForm />
          <p className={styles.accessNote}>Sólo recibirán el enlace los usuarios dados de alta por Eon Labs.</p>
        </div>

        <div className={styles.preview} aria-label="Vista previa de un presupuesto">
          <div className={styles.previewTop}>
            <div>
              <span className={styles.previewLabel}>Presupuesto</span>
              <h2>PF-2026-001</h2>
            </div>
            <span className={styles.status}><Check size={14} /> Aceptado</span>
          </div>

          <div className={styles.clientRow}>
            <div><span>Cliente</span><strong>Reformas Montalvo</strong></div>
            <div><span>Válido hasta</span><strong>18 sep 2026</strong></div>
          </div>

          <div className={styles.items}>
            {items.map((item) => (
              <div className={styles.item} key={item.concept}>
                <span>{item.concept}</span>
                <small>{item.quantity} ud.</small>
                <strong>{item.amount}</strong>
              </div>
            ))}
          </div>

          <div className={styles.total}>
            <span>Total <small>IVA incluido</small></span>
            <strong>1.433,85 €</strong>
          </div>

          <div className={styles.timeline}>
            <span><i /> Compartido · 09:42</span>
            <span><i /> Visto · 10:16</span>
            <span><i /> Aceptado · 10:19</span>
          </div>
        </div>
      </section>
    </main>
  );
}
