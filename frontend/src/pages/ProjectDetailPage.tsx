import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ProductPreview } from "../components/ProductPreview";
import { ProjectCard } from "../components/ProjectCard";
import { Seo } from "../components/Seo";
import { categoryLabels, getProject, projects } from "../data/projects";

export function ProjectDetailPage() {
  const { slug } = useParams(); const project = getProject(slug);
  if (!project) return <Navigate to="/404" replace/>;
  const related = projects.filter((item) => item.slug !== project.slug && (item.category === project.category || item.featured)).slice(0, 2);
  const jsonLd = { "@context": "https://schema.org", "@type": "CreativeWork", name: project.title, description: project.summary, isBasedOn: "Demo conceptual de Eon Labs", learningResourceType: "Demo de software" };
  return <>
    <Seo title={project.seo.title} description={project.seo.description} path={`/showroom/${project.slug}`} jsonLd={jsonLd}/>
    <section className="detail-hero section-pad"><Link className="breadcrumb" to="/showroom"><ArrowLeft size={15}/> Showroom</Link><div className="detail-heading"><div><div className="project-meta"><span className="category-badge">{categoryLabels[project.category]}</span><span className="demo-label">Demo Eon</span></div><h1>{project.title}</h1><p>{project.summary}</p></div><Link className="button button-accent" to={`/empezar?proyecto=${project.slug}`}>Quiero algo parecido <ArrowRight size={17}/></Link></div><ProductPreview project={project} large/></section>
    <section className="detail-content section-pad">
      <article className="detail-lead"><p className="eyebrow">PARA QUÉ SIRVE</p><h2>Una vista común para que el siguiente paso sea evidente.</h2><p>{project.problem}</p></article>
      <article><p className="eyebrow">EL PROBLEMA</p><h2>La información existe, pero está repartida.</h2><p>{project.problem}</p></article>
      <article><p className="eyebrow">CÓMO FUNCIONA</p><ol className="number-list">{project.howItWorks.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol></article>
      <article><p className="eyebrow">QUÉ PUEDE INCLUIR</p><div className="feature-tags">{project.features.map((item) => <span key={item}><CheckCircle2 size={15}/>{item}</span>)}</div></article>
      <article className="two-column-info"><div><p className="eyebrow">PARA QUIÉN PUEDE SERVIR</p><ul>{project.audience.map((item) => <li key={item}>{item}</li>)}</ul><h3>Usos habituales</h3><ul>{project.useCases.map((item) => <li key={item}>{item}</li>)}</ul></div><div><p className="eyebrow">CÓMO PODEMOS ADAPTARLO</p><ul>{project.customization.map((item) => <li key={item}>{item}</li>)}</ul><h3>Sectores de referencia</h3><ul>{project.industries.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
    </section>
    <section className="section-pad section-block"><div className="section-heading"><p className="eyebrow">HERRAMIENTAS RELACIONADAS</p><h2>Otros puntos de partida.</h2></div><div className="project-grid related-grid">{related.map((item) => <ProjectCard key={item.slug} project={item}/>)}</div></section>
    <section className="compact-cta section-pad"><div><p className="eyebrow">ADAPTACIÓN</p><h2>Esta demo es un punto de partida, no una solución cerrada.</h2></div><Link className="button button-dark" to={`/empezar?proyecto=${project.slug}`}>Quiero algo parecido <ArrowRight size={17}/></Link></section>
  </>;
}
