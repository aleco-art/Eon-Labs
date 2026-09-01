import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { siteConfig } from "../config";

const links = [{ to: "/showroom", label: "Showroom" }, { to: "/soluciones", label: "Soluciones" }, { to: "/como-trabajamos", label: "Cómo trabajamos" }, { to: "/paquetes", label: "Paquetes" }];

function BrandLogo({ footer = false }: { footer?: boolean }) {
  return <Link className={`brand-logo ${footer ? "footer-logo" : ""}`} to="/" aria-label="Eon Labs, inicio"><img src="/eon-labs-logo.png" alt="Eon Labs"/></Link>;
}

export function Layout() {
  const [open, setOpen] = useState(false); const menuRef = useRef<HTMLDivElement>(null); const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const onClick = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);
  return <div className="site-shell">
    <header className="site-header" ref={menuRef}>
      <BrandLogo/>
      <nav className="desktop-nav" aria-label="Navegación principal">{links.map((link) => <NavLink key={link.to} className={({ isActive }) => isActive ? "active" : ""} to={link.to}>{link.label}</NavLink>)}</nav>
      <Link className="button button-dark header-cta" to="/empezar">Empezar proyecto <ArrowRight size={16}/></Link>
      <button className="menu-button" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      {open && <nav id="mobile-nav" className="mobile-nav" aria-label="Navegación móvil">{links.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)}>{link.label}</NavLink>)}<Link to="/empezar" onClick={() => setOpen(false)}>Empezar proyecto</Link></nav>}
    </header>
    <main id="main-content"><Outlet/></main>
    <footer className="site-footer section-pad">
      <div><BrandLogo footer/><p>Tecnología accesible bajo demanda.</p></div>
      <nav aria-label="Navegación del pie">{links.map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}</nav>
      <div className="footer-contact">{siteConfig.whatsappNumber && <a href={`https://wa.me/${siteConfig.whatsappNumber}`}>WhatsApp</a>}{siteConfig.email && <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>}<Link to="/empezar">Contacto inicial</Link></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Eon Labs</span><span>Las herramientas mostradas son demos, no casos de clientes.</span></div>
    </footer>
  </div>;
}
