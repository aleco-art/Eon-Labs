import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProjectCard } from "../components/ProjectCard";
import { Seo } from "../components/Seo";
import { categoryLabels, projects, type ProjectCategory } from "../data/projects";

type Filter = "todos" | ProjectCategory;
const filters: Filter[] = ["todos", "clientes", "operaciones", "administracion", "educacion", "automatizacion", "web"];

export function ShowroomPage() {
  const [filter, setFilter] = useState<Filter>("todos");
  const visible = filter === "todos" ? projects : projects.filter((project) => project.category === filter);
  return <>
    <Seo title="Showroom de herramientas | Eon Labs" description="Explora demos de CRM, gestión interna, operaciones y automatización adaptables a pequeños negocios." path="/showroom"/>
    <section className="page-hero section-pad"><p className="eyebrow">SHOWROOM</p><h1>Herramientas que puedes ver, probar y adaptar.</h1><p>Cinco demos para reconocer un problema concreto antes de definir una solución.</p></section>
    <section className="section-pad showroom-section" aria-labelledby="showroom-title"><h2 id="showroom-title" className="sr-only">Proyectos del showroom</h2>
      <div className="filter-chips" role="toolbar" aria-label="Filtrar proyectos">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item === "todos" ? "Todos" : categoryLabels[item]}</button>)}</div>
      {visible.length ? <div className="project-grid showroom-grid">{visible.map((project) => <ProjectCard key={project.slug} project={project}/>)}</div> : <div className="empty-state"><h3>No hay demos en esta categoría todavía.</h3><p>Puedes explorar el resto del showroom o contarnos el proceso que necesitas ordenar.</p><button type="button" onClick={() => setFilter("todos")}>Ver todas las demos</button></div>}
    </section>
    <section className="compact-cta section-pad"><div><p className="eyebrow">¿ALGO SE PARECE?</p><h2>Lo usamos como punto de partida y lo ajustamos a tu negocio.</h2></div><Link className="button button-dark" to="/empezar">Empezar proyecto <ArrowRight size={17}/></Link></section>
  </>;
}
