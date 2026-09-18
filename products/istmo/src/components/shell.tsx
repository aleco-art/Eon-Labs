"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogOut, Menu, MessageSquare, Plus, Shield, UserRound, X } from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
import { NotificationBell } from "./notifications";

type SessionState = { user: User | null; ready: boolean; isModerator: boolean };
const Session = createContext<SessionState>({ user: null, ready: false, isModerator: false });
export const useSession = () => useContext(Session);

export function BrandMark({ size = 30 }: { size?: number }) {
  // Four quarters like the Panamanian flag: white/blue star, red, blue, white/red star.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="#fff" stroke="#e1e6ef" />
      <path d="M16 1h7a8 8 0 0 1 8 8v7H16z" fill="#d21034" />
      <path d="M1 16h15v15H9a8 8 0 0 1-8-8z" fill="#0b3d8c" />
      <path d="m8.5 4.6 1 3h3.1l-2.5 1.8.9 3-2.5-1.8L6 12.4l.9-3-2.5-1.8h3.1z" fill="#0b3d8c" />
      <path d="m23.5 19.6 1 3h3.1l-2.5 1.8.9 3-2.5-1.8-2.5 1.8.9-3-2.5-1.8h3.1z" fill="#d21034" />
    </svg>
  );
}

const links = [
  { href: "/", label: "Propuestas" },
  { href: "/responsables", label: "Responsables por área" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/fuentes", label: "Fuentes" },
];

export function Shell({ children, siteName }: { children: React.ReactNode; siteName: string }) {
  const [state, setState] = useState<SessionState>({ user: null, ready: !configured, isModerator: false });
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!configured) return;
    const db = browserDb();
    const resolve = async (user: User | null) => {
      let isModerator = false;
      if (user) isModerator = Boolean((await db.rpc("is_moderator")).data);
      setState({ user, ready: true, isModerator });
    };
    db.auth.getUser().then(({ data }) => resolve(data.user));
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      void resolve(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await browserDb().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const { user, isModerator } = state;
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined;

  return (
    <Session.Provider value={state}>
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand" aria-label={`${siteName}, inicio`}>
            <BrandMark />
            {siteName.toLowerCase()}
          </Link>
          <nav className="main-nav" aria-label="Principal">
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={current(l.href)}>{l.label}</Link>
            ))}
          </nav>
          <div className="top-actions">
            {isModerator && (
              <Link className="account-link desktop-only" href="/moderacion"><Shield size={17} /> Moderación</Link>
            )}
            {user ? (
              <>
                <NotificationBell />
                <Link className="account-link desktop-only" href="/mensajes"><MessageSquare size={17} /> Mensajes</Link>
                <Link className="account-link desktop-only" href={"/perfil/" + user.id}><UserRound size={18} /> Mi perfil</Link>
                <button className="account-link desktop-only" onClick={signOut}><LogOut size={17} /> Salir</button>
              </>
            ) : (
              <Link className="account-link desktop-only" href="/cuenta">Iniciar sesión</Link>
            )}
            <Link className="button accent small desktop-only" href="/crear"><Plus size={17} /> Hacer una propuesta</Link>
            <button className="menu-button" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <div className="flag-rule" />
      </header>
      <div
        className="mobile-drawer"
        data-open={open}
        aria-hidden={!open}
        onClick={(e) => {
          // Any navigation from the drawer closes it.
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={current(l.href)}>{l.label}</Link>
        ))}
        {user ? (
          <>
            <Link href="/mensajes"><MessageSquare size={18} /> Mensajes</Link>
            <Link href={"/perfil/" + user.id}><UserRound size={18} /> Mi perfil</Link>
            {isModerator && <Link href="/moderacion"><Shield size={18} /> Moderación</Link>}
            <button className="drawer-item" onClick={signOut}><LogOut size={18} /> Cerrar sesión</button>
          </>
        ) : (
          <Link href="/cuenta">Iniciar sesión o crear cuenta</Link>
        )}
        <Link className="button accent" href="/crear"><Plus size={18} /> Hacer una propuesta</Link>
      </div>
      <main id="contenido">{children}</main>
      <footer className="site-footer">
        <div className="flag-rule" />
        <div className="inner">
          <span>
            {siteName} conecta propuestas con quienes pueden impulsarlas. No aprueba propuestas, no garantiza su ejecución y no representa a ninguna entidad.
          </span>
          <nav aria-label="Legal">
            <Link href="/como-funciona">Cómo funciona</Link>
            <Link href="/fuentes">Fuentes y actualización</Link>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
            <Link href="/contacto">Contacto</Link>
          </nav>
        </div>
      </footer>
    </Session.Provider>
  );
}
