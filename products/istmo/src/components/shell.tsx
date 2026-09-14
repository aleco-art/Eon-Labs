"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Compass,
  Plus,
  Users,
  BookOpen,
  ArrowUpRight,
  LogOut,
  UserRound,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
const Session = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});
export const useSession = () => useContext(Session);
export function Shell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!configured);
  const [menu, setMenu] = useState(false);
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!configured) return;
    const db = browserDb();
    db.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const links = [
    { href: "/", label: "Explorar ideas", icon: Compass },
    { href: "/directorio", label: "Conectar con aliados", icon: Users },
    { href: "/fuentes", label: "Fuentes y datos", icon: BookOpen },
  ];
  return (
    <Session.Provider value={{ user, ready }}>
      <a className="skip" href="#content">
        Saltar al contenido
      </a>
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">i.</span>istmo
          <span className="country">PANAMÁ</span>
        </Link>
        <div className="top-actions">
          <span className="top-note">Un país. Miles de posibilidades.</span>
          {user ? (
            <Link className="account" href={"/perfil/" + user.id}>
              <UserRound size={18} />
              Mi perfil
            </Link>
          ) : (
            <Link className="account" href="/cuenta">
              Iniciar sesión
              <ArrowUpRight size={16} />
            </Link>
          )}
          <button
            className="mobile-menu icon-button"
            aria-label="Abrir navegación"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <div className="app-layout">
        <aside className={"sidebar " + (menu ? "open" : "")}>
          <div className="sidebar-top">
            <p className="eyebrow">ESPACIO CIUDADANO</p>
            <nav>
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  onClick={() => setMenu(false)}
                  className={path === href ? "nav-link active" : "nav-link"}
                  key={href}
                  href={href}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
            </nav>
            <Link
              className="button primary new-proposal"
              href="/crear"
              onClick={() => setMenu(false)}
            >
              <Plus size={19} />
              Publicar una idea
            </Link>
          </div>
          <div className="sidebar-bottom">
            <div className="principle">
              <span className="mini-mark">↗</span>
              <h3>
                El siguiente paso
                <br />
                empieza contigo.
              </h3>
              <p>
                Las ideas son tuyas.
                <br />
                Las conexiones, de todos.
              </p>
            </div>
            {user && (
              <>
                <Link className="small-link" href="/moderacion">
                  <Shield size={15} /> Moderación
                </Link>
                <button
                  className="small-link"
                  onClick={async () => {
                    await browserDb().auth.signOut();
                    router.push("/");
                    router.refresh();
                  }}
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </>
            )}
            <div className="footer-links">
              <Link href="/privacidad">Privacidad</Link>
              <Link href="/terminos">Términos</Link>
              <Link href="/contacto">Contacto</Link>
            </div>
            <small>Hecho para conectar Panamá.</small>
          </div>
        </aside>
        <main id="content" className="main-content">
          {children}
        </main>
      </div>
    </Session.Provider>
  );
}
