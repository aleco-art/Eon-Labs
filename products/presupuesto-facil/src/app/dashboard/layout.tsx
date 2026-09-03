import Image from "next/image";
import Link from "next/link";
import { FileText, LayoutDashboard, LogOut } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { requireOwnerEmail } from "@/lib/session";
import styles from "./dashboard.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await requireOwnerEmail();
  const displayName = email.split("@")[0] ?? "Profesional";

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/dashboard" aria-label="Presupuesto Fácil">
          <Image src="/eon-mark.svg" alt="" width={36} height={36} />
          <span>
            <strong>Presupuesto Fácil</strong>
            <small>by Eon Labs</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal">
          <Link className={styles.active} href="/dashboard">
            <LayoutDashboard size={18} /> Presupuestos
          </Link>
          <Link href="/dashboard/nuevo">
            <FileText size={18} /> Nuevo
          </Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <form action={logout}>
            <button type="submit">
              <LogOut size={18} /> Salir
            </button>
          </form>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <span>Espacio de trabajo</span>
            <strong>{email}</strong>
          </div>
          <div className={styles.avatar} aria-label={`Sesión de ${displayName}`}>
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        </header>

        <div className={styles.mainContent}>{children}</div>
      </section>
    </main>
  );
}
