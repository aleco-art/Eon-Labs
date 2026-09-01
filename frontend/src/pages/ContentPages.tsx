import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { projects } from "../data/projects";

const solutions = [
  ["01", "Organizar clientes", "CRM, seguimiento y pipeline para que cada contacto tenga un próximo paso.", "crm-inmobiliario"],
  ["02", "Organizar operaciones", "Gestión interna, proyectos, inventario y trabajo en una vista común.", "seguimiento-obras"],
  ["03", "Entender el negocio", "Dashboards, reportes y boards con la información que se usa para decidir.", "control-distribuidora"],
  ["04", "Reducir tareas repetitivas", "Automatizaciones, agentes e integraciones para pasos concretos.", "automatizacion-administrativa"],
  ["05", "Crear experiencias digitales", "Webs, landings, portales y herramientas educativas claras.", "gestion-academia-idiomas"],
  ["06", "Resolver un proceso específico", "Digitalización y software construido alrededor del trabajo real.", "crm-inmobiliario"],
];

export function SolutionsPage() {
  return <><Seo title="Soluciones digitales operativas | Eon Labs" description="Capacidades para organizar clientes, operaciones, información y tareas repetitivas." path="/soluciones"/><section className="page-hero section-pad"><p className="eyebrow">SOLUCIONES</p><h1>Empieza por la necesidad, no por la tecnología.</h1><p>Traducimos un proceso concreto en una herramienta que el negocio pueda usar y mantener.</p></section><section className="section-pad solution-list">{solutions.map(([number, title, text, slug]) => { const project = projects.find((item) => item.slug === slug); return <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{text}</p>{project && <Link to={`/showroom/${project.slug}`}>Ver demo relacionada <ArrowRight size={15}/></Link>}</div></article>; })}</section><section className="compact-cta section-pad"><div><p className="eyebrow">SIGUIENTE PASO</p><h2>No hace falta llegar con la solución definida.</h2></div><Link className="button button-dark" to="/empezar">Contar mi necesidad <ArrowRight size={17}/></Link></section></>;
}

export function ProcessPage() {
  const steps = [
    ["01", "Mapeamos el flujo actual", "Identificamos entradas, responsables, decisiones, herramientas y salidas del proceso."],
    ["02", "Definimos el cuello de botella", "Priorizamos el punto operativo que más tiempo, errores o falta de visibilidad genera."],
    ["03", "Diseñamos el flujo objetivo", "Acordamos estados, datos, responsabilidades y criterios antes de construir."],
    ["04", "Ponemos una versión en operación", "Entregamos un recorrido utilizable y lo incorporamos al trabajo cotidiano."],
    ["05", "Revisamos datos y uso", "Observamos qué se usa, qué se atasca y qué decisiones necesita el equipo."],
    ["06", "Ajustamos y documentamos", "Mejoramos la herramienta y dejamos reglas operativas claras para el siguiente ciclo."],
  ];
  return <><Seo title="Cómo trabajamos | Eon Labs" description="Un proceso directo para entender, construir y adaptar herramientas digitales operativas." path="/como-trabajamos"/><section className="page-hero section-pad"><p className="eyebrow">CÓMO TRABAJAMOS</p><h1>Construimos cerca del proceso real.</h1><p>Podemos partir de una solución existente de Eon o diseñar una herramienta específica.</p></section><section className="section-pad work-steps">{steps.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></article>)}</section><section className="compact-cta section-pad"><div><p className="eyebrow">EMPEZAR</p><h2>El primer brief nos ayuda a entender el contexto.</h2></div><Link className="button button-dark" to="/empezar">Empezar proyecto <ArrowRight size={17}/></Link></section></>;
}

const packageData = [
  ["Base", "Partimos de un problema ya definido y construimos una herramienta concreta para resolverlo.", "Un problema ya definido.", ["Un recorrido principal", "Datos y estados necesarios", "Primera versión para usar"]],
  ["Adaptado", "Del demo a tu negocio.", "Una base que ya encaja.", ["Estructura probada", "Campos y etapas propias", "Ajustes al uso real"]],
  ["A medida", "Entendemos el proceso a detalle y construimos en base a ello.", "Un proceso propio.", ["Descubrimiento del proceso", "Diseño específico", "Evolución por uso"]],
] as const;

export function PackagesPage() {
  return <><Seo title="Formas de empezar | Eon Labs" description="Tres formas de encuadrar un proyecto: Base, Adaptado y A medida, sin planes cerrados ni precios inventados." path="/paquetes"/><section className="page-hero section-pad"><p className="eyebrow">PAQUETES</p><h1>Tres formas de encuadrar un proyecto.</h1><p>No son planes SaaS ni suscripciones. El alcance se define después de entender la necesidad.</p></section><section className="section-pad package-grid package-page">{packageData.map(([name, description, need, items]) => <article key={name} className="package-card"><span className="category-badge">{need}</span><h2>{name}</h2><p>{description}</p><ul>{items.map((item) => <li key={item}><CheckCircle2/>{item}</li>)}</ul><Link className="button button-dark" to={`/empezar?paquete=${name.toLowerCase().replace(" ", "-")}`}>Empezar con {name} <ArrowRight size={16}/></Link></article>)}</section><div className="package-note section-pad"><strong>¿No sabes cuál elegir?</strong><p>No necesitas decidirlo ahora. Eon recomienda el enfoque después del contacto inicial.</p><Link to="/empezar">Empezar sin paquete</Link></div></>;
}

export function NotFoundPage() { return <section className="not-found section-pad"><Seo title="Página no encontrada | Eon Labs" description="La página solicitada no existe."/><p className="eyebrow">ERROR 404</p><h1>Esta página no existe.</h1><p>Puedes volver al showroom y explorar las herramientas disponibles.</p><Link className="button button-dark" to="/showroom">Ir al showroom <ArrowRight size={17}/></Link></section>; }
