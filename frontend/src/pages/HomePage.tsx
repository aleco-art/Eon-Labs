import { ArrowRight, BarChart3, Blocks, Bot, Cable, CheckCircle2, GraduationCap, Handshake, LayoutDashboard, RefreshCw, UsersRound, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroPreview } from "../components/ProductPreview";
import { ProjectCard } from "../components/ProjectCard";
import { Seo } from "../components/Seo";
import { siteConfig } from "../config";
import { projects } from "../data/projects";

const capabilities = [
  [UsersRound, "CRM", "Clientes, oportunidades y próximos pasos en un solo lugar."], [Blocks, "Gestión interna", "Procesos, tareas y responsables con una vista común."],
  [BarChart3, "Dashboards y boards", "La información necesaria para decidir y actuar."], [RefreshCw, "Automatizaciones", "Pasos repetitivos convertidos en reglas visibles."],
  [Bot, "Agentes", "Asistentes acotados para tareas concretas y repetibles."], [LayoutDashboard, "Webs y landings", "Experiencias claras que explican y convierten."],
  [GraduationCap, "Herramientas educativas", "Alumnos, materiales, clases y progreso organizados."], [Cable, "Integraciones", "Herramientas conectadas sin copiar datos a mano."],
  [Wrench, "Software a medida", "Una solución construida alrededor de tu proceso."], [Handshake, "Soporte operativo", "Acompañamiento para digitalizar y ajustar el trabajo real."],
] as const;

const packages = [
  { name: "Base", description: "Partimos de un problema ya definido y construimos una herramienta concreta para resolverlo.", need: "Un problema ya definido", items: ["Primera versión útil", "Flujo principal", "Puesta en marcha"] },
  { name: "Adaptado", description: "Del demo a tu negocio.", need: "Una base que ya encaja", items: ["Base existente", "Campos y etapas propias", "Ajustes al uso real"] },
  { name: "A medida", description: "Entendemos el proceso a detalle y construimos en base a ello.", need: "Un proceso propio", items: ["Descubrimiento del proceso", "Diseño específico", "Evolución por uso"] },
];

export function HomePage() {
  return <>
    <Seo title="Eon Labs — Tecnología accesible bajo demanda" description="Software, automatizaciones y herramientas internas adaptadas a pequeñas empresas y profesionales." jsonLd={{ "@context": "https://schema.org", "@type": "WebSite", name: "Eon Labs", description: "Tecnología accesible bajo demanda." }}/>
    <section className="hero section-pad">
      <div className="hero-copy"><p className="eyebrow">SOFTWARE OPERATIVO · HECHO A MEDIDA</p><h1>Tecnología accesible <em>bajo demanda.</em></h1>
        <div className="button-row"><Link className="button button-accent" to="/showroom">Explorar showroom <ArrowRight size={18}/></Link><Link className="text-link" to="/empezar">Cuéntanos qué necesitas</Link></div>
        <div className="hero-proof"><span><CheckCircle2/> Proceso claro</span><span><CheckCircle2/> Primera versión útil</span><span><CheckCircle2/> Adaptado al uso real</span></div>
      </div><HeroPreview/>
    </section>
    <section className="section-pad section-block">
      <div className="section-heading split-heading"><div><p className="eyebrow">SHOWROOM</p><h2>Showroom de servicios.</h2></div><div><p>No necesitas saber qué software pedir. Empieza por una herramienta parecida a lo que hoy organizas entre Excel, WhatsApp, notas y memoria.</p><Link className="text-link" to="/showroom">Ver todo el showroom</Link></div></div>
      <div className="project-grid bento-grid">{projects.slice(0, 4).map((project, index) => <ProjectCard key={project.slug} project={project} featured={index === 0}/>)}</div>
    </section>
    <section id="soluciones" className="section-pad section-block">
      <div className="section-heading"><p className="eyebrow">QUÉ PODEMOS CONSTRUIR</p><h2>Capacidades para ordenar, conectar y hacer avanzar el trabajo.</h2></div>
      <div className="capability-grid">{capabilities.map(([Icon, title, text], index) => <article key={title}><span className="cap-number">{String(index + 1).padStart(2, "0")}</span><Icon/><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
    <section id="proceso" className="dark-section"><div className="section-pad section-block"><div className="section-heading split-heading"><div><p className="eyebrow">OPERACIÓN DE TRABAJO</p><h2>Un sistema operativo para construir, probar y mejorar.</h2></div><p>Trabajamos sobre procesos, responsables, datos y criterios claros. Cada ciclo deja una versión utilizable y decisiones documentadas.</p></div>
      <ol className="process-list">{["Mapeamos el flujo actual", "Priorizamos el cuello de botella", "Ponemos una versión en operación", "Medimos, ajustamos y documentamos"].map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></li>)}</ol><Link className="button button-light" to="/como-trabajamos">Ver la operación <ArrowRight size={17}/></Link>
    </div></section>
    <section id="paquetes" className="section-pad section-block"><div className="section-heading"><p className="eyebrow">PLANES DE TRABAJO</p><h2>Planes de trabajo.</h2></div>
      <div className="package-grid">{packages.map((item) => <article key={item.name} className="package-card"><span className="category-badge">{item.need}</span><h3>{item.name}</h3><p>{item.description}</p><ul>{item.items.map((feature) => <li key={feature}><CheckCircle2/>{feature}</li>)}</ul><Link className="card-link" to={`/empezar?paquete=${encodeURIComponent(item.name.toLowerCase())}`}>Empezar por aquí <ArrowRight size={16}/></Link></article>)}</div>
    </section>
    <section className="final-cta section-pad"><p className="eyebrow">PRIMER PASO</p><h2>¿Te interesa empezar a colaborar?</h2><div className="button-row"><Link className="button button-accent" to="/empezar">Cuéntanos cómo trabajas <ArrowRight size={18}/></Link>{siteConfig.whatsappNumber ? <a className="text-link" href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent("Hola Eon Labs. Me interesa empezar a colaborar.")}`}>Hablar por WhatsApp</a> : <Link className="text-link" to="/empezar?canal=whatsapp">Hablar por WhatsApp</Link>}</div></section>
  </>;
}
