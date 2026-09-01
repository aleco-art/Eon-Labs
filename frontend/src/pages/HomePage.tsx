import { ArrowRight, BarChart3, Blocks, Bot, Cable, CheckCircle2, GraduationCap, Handshake, LayoutDashboard, RefreshCw, UsersRound, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroPreview } from "../components/ProductPreview";
import { ProjectCard } from "../components/ProjectCard";
import { Seo } from "../components/Seo";
import { projects } from "../data/projects";

const capabilities = [
  [UsersRound, "CRM", "Clientes, oportunidades y próximos pasos en un solo lugar."], [Blocks, "Gestión interna", "Procesos, tareas y responsables con una vista común."],
  [BarChart3, "Dashboards y boards", "La información necesaria para decidir y actuar."], [RefreshCw, "Automatizaciones", "Pasos repetitivos convertidos en reglas visibles."],
  [Bot, "Agentes", "Asistentes acotados para tareas concretas y repetibles."], [LayoutDashboard, "Webs y landings", "Experiencias claras que explican y convierten."],
  [GraduationCap, "Herramientas educativas", "Alumnos, materiales, clases y progreso organizados."], [Cable, "Integraciones", "Herramientas conectadas sin copiar datos a mano."],
  [Wrench, "Software a medida", "Una solución construida alrededor de tu proceso."], [Handshake, "Soporte operativo", "Acompañamiento para digitalizar y ajustar el trabajo real."],
] as const;

const packages = [
  { name: "Base", description: "Una herramienta concreta para resolver un problema definido.", need: "Cuando el alcance está claro", items: ["Primera versión útil", "Flujo principal", "Puesta en marcha"] },
  { name: "Adaptado", description: "Partimos de una solución de Eon y la ajustamos al negocio.", need: "Cuando una demo se parece a lo que necesitas", items: ["Base existente", "Campos y etapas propias", "Ajustes al uso real"] },
  { name: "A medida", description: "Entendemos el proceso y diseñamos una herramienta específicamente para él.", need: "Cuando el proceso necesita una solución propia", items: ["Descubrimiento del proceso", "Diseño específico", "Evolución por uso"] },
];

export function HomePage() {
  return <>
    <Seo title="Eon Labs — Herramientas digitales operativas" description="Software, automatizaciones y herramientas internas adaptadas a pequeñas empresas y profesionales." jsonLd={{ "@context": "https://schema.org", "@type": "WebSite", name: "Eon Labs", description: "Showroom de herramientas digitales operativas." }}/>
    <section className="hero section-pad">
      <div className="hero-copy"><p className="eyebrow">SOFTWARE OPERATIVO · HECHO A MEDIDA</p><h1>Herramientas digitales hechas para <em>cómo funciona</em> tu negocio.</h1><p className="lede">Creamos software, automatizaciones y herramientas internas adaptadas a pequeñas empresas y profesionales.</p>
        <div className="button-row"><Link className="button button-accent" to="/showroom">Explorar showroom <ArrowRight size={18}/></Link><Link className="text-link" to="/empezar">Cuéntanos qué necesitas</Link></div>
        <div className="hero-proof"><span><CheckCircle2/> Proceso claro</span><span><CheckCircle2/> Primera versión útil</span><span><CheckCircle2/> Adaptado al uso real</span></div>
      </div><HeroPreview/>
    </section>
    <section className="section-pad section-block">
      <div className="section-heading split-heading"><div><p className="eyebrow">SHOWROOM · DEMOS EON</p><h2>Interfaces concretas.<br/>Problemas reconocibles.</h2></div><div><p>No necesitas saber qué software pedir. Empieza por una herramienta parecida a lo que hoy organizas entre Excel, WhatsApp, notas y memoria.</p><Link className="text-link" to="/showroom">Ver todo el showroom</Link></div></div>
      <div className="project-grid bento-grid">{projects.slice(0, 4).map((project, index) => <ProjectCard key={project.slug} project={project} featured={index === 0}/>)}</div>
    </section>
    <section id="soluciones" className="section-pad section-block">
      <div className="section-heading"><p className="eyebrow">QUÉ PODEMOS CONSTRUIR</p><h2>Capacidades para ordenar, conectar y hacer avanzar el trabajo.</h2></div>
      <div className="capability-grid">{capabilities.map(([Icon, title, text], index) => <article key={title}><span className="cap-number">{String(index + 1).padStart(2, "0")}</span><Icon/><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
    <section id="proceso" className="dark-section"><div className="section-pad section-block"><div className="section-heading split-heading"><div><p className="eyebrow">CÓMO TRABAJAMOS</p><h2>De un proceso difuso a una herramienta útil.</h2></div><p>Partimos de cómo funciona el negocio ahora y construimos solo lo que merece existir.</p></div>
      <ol className="process-list">{["Entendemos cómo trabajas", "Definimos qué vale la pena construir", "Creamos una primera versión", "La adaptamos al uso real"].map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></li>)}</ol><Link className="button button-light" to="/como-trabajamos">Ver el proceso <ArrowRight size={17}/></Link>
    </div></section>
    <section id="paquetes" className="section-pad section-block"><div className="section-heading"><p className="eyebrow">FORMAS DE EMPEZAR</p><h2>El enfoque depende del problema, no de un plan cerrado.</h2><p>Sin precios prefabricados. Primero entendemos el alcance y recomendamos una forma de trabajo.</p></div>
      <div className="package-grid">{packages.map((item) => <article key={item.name} className="package-card"><span className="category-badge">{item.need}</span><h3>{item.name}</h3><p>{item.description}</p><ul>{item.items.map((feature) => <li key={feature}><CheckCircle2/>{feature}</li>)}</ul><Link className="card-link" to={`/empezar?paquete=${encodeURIComponent(item.name.toLowerCase())}`}>Empezar por aquí <ArrowRight size={16}/></Link></article>)}</div>
    </section>
    <section className="final-cta section-pad"><p className="eyebrow">PRIMER PASO</p><h2>¿Tienes un proceso que todavía depende de Excel, WhatsApp o memoria?</h2><div className="button-row"><Link className="button button-accent" to="/empezar">Cuéntanos cómo trabajas <ArrowRight size={18}/></Link><Link className="text-link" to="/empezar">Prefiero empezar con un brief</Link></div></section>
  </>;
}
