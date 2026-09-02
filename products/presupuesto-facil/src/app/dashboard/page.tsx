import Image from "next/image";
import Link from "next/link";
import { FilePlus2, FileText, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const user = await requireUser();
  const displayName = user.fullName ?? user.email.split("@")[0] ?? "Profesional";

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/dashboard" aria-label="Presupuesto Fácil">
          <Image src="/eon-mark.svg" alt="" width={36} height={36} />
          <span><strong>Presupuesto Fácil</strong><small>by Eon Labs</small></span>
        </Link>
        <nav aria-label="Navegación principal">
          <Link className={styles.active} href="/dashboard"><LayoutDashboard size={18} /> Resumen</Link>
          <span><FileText size={18} /> Presupuestos</span>
          <span><Users size={18} /> Clientes</span>
        </nav>
        <div className={styles.sidebarBottom}>
          <span><Settings size={18} /> Configuración</span>
          <form action={logout}><button type="submit"><LogOut size={18} /> Salir</button></form>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div><span>Espacio de trabajo</span><strong>{user.businessName ?? "Mi negocio"}</strong></div>
          <div className={styles.avatar} aria-label={`Sesión de ${displayName}`}>{displayName.slice(0, 2).toUpperCase()}</div>
        </header>

        <div className={styles.mainContent}>
          <div className={styles.heading}>
            <div><p>Buenos días, {displayName}</p><h1>Resumen</h1></div>
            <button type="button" disabled><FilePlus2 size={18} /> Nuevo presupuesto</button>
          </div>

          <section className={styles.metrics} aria-label="Estado de presupuestos">
            <article><span>Borradores</span><strong>0</strong><small>Por completar</small></article>
            <article><span>Esperando respuesta</span><strong>0</strong><small>Compartidos y vistos</small></article>
            <article><span>Aceptados</span><strong>0</strong><small>Este mes</small></article>
          </section>

          <section className={styles.empty}>
            <div className={styles.emptyIcon}><FileText size={24} /></div>
            <h2>Aún no hay presupuestos</h2>
            <p>La creación del primer presupuesto se habilitará en la siguiente fase.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
