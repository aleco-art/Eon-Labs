import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { categoryLabels, type Project } from "../data/projects";
import { ProductPreview } from "./ProductPreview";

export function ProjectCard({ project, featured = false }: { project: Project; featured?: boolean }) {
  return <article className={`project-card ${featured ? "featured-card" : ""}`}>
    <div className="project-meta"><span className="category-badge">{categoryLabels[project.category]}</span><span className="demo-label">Demo Eon</span></div>
    <div className="card-copy"><h3><Link to={`/showroom/${project.slug}`}>{project.title}</Link></h3><p>{project.summary}</p></div>
    <ProductPreview project={project}/><div className="tag-row">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    <Link className="card-link" to={`/showroom/${project.slug}`}>Explorar <ArrowUpRight size={17}/></Link>
  </article>;
}
