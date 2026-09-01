import { useState } from "react";
import { ArrowUpRight, Bot, Building2, CalendarDays, Check, CircleAlert, PackageCheck, UsersRound } from "lucide-react";
import type { PreviewType, Project } from "../data/projects";

type PreviewRow = { name: string; meta: string; status: string; value: string };
const previewRows: Record<PreviewType, PreviewRow[]> = {
  crm: [{ name: "Marina Torres", meta: "Casa Roble", status: "Visita agendada", value: "€ 285k" }, { name: "Sergio Lima", meta: "Apartamento Norte", status: "Propuesta", value: "€ 198k" }, { name: "Ana Beltrán", meta: "Local Centro", status: "Contacto nuevo", value: "€ 124k" }],
  academy: [{ name: "Lucía M.", meta: "B2 · Grupo tarde", status: "Presente", value: "Al día" }, { name: "Álvaro R.", meta: "A2 · Grupo mañana", status: "Pendiente", value: "Revisar" }, { name: "Inés C.", meta: "C1 · Individual", status: "Presente", value: "Al día" }],
  works: [{ name: "Casa Olivo", meta: "Estructura", status: "68%", value: "Visita jue." }, { name: "Local Prado", meta: "Instalaciones", status: "42%", value: "3 pendientes" }, { name: "Reforma Norte", meta: "Acabados", status: "86%", value: "Visita lun." }],
  distribution: [{ name: "PED-1048", meta: "Ferretería Sol", status: "Preparando", value: "€ 1.240" }, { name: "PED-1047", meta: "Obras Rivera", status: "En ruta", value: "€ 860" }, { name: "PED-1046", meta: "Casa Norte", status: "Entregado", value: "€ 425" }],
  automation: [{ name: "Nueva solicitud", meta: "Formulario web", status: "Activo", value: "Hace 4 min" }, { name: "Aviso de cobro", meta: "Factura vencida", status: "Activo", value: "Hoy, 09:00" }, { name: "Resumen semanal", meta: "Cada viernes", status: "Pausado", value: "Vie. anterior" }],
};
const iconMap = { crm: UsersRound, academy: CalendarDays, works: Building2, distribution: PackageCheck, automation: Bot };

export function ProductPreview({ project, large = false }: { project: Project; large?: boolean }) {
  const [selected, setSelected] = useState(0); const [enabled, setEnabled] = useState(true);
  const rows = previewRows[project.previewType]; const Icon = iconMap[project.previewType]; const current = rows[selected] ?? rows[0];
  return (
    <div className={`product-window preview-${project.previewType} ${large ? "preview-large" : ""}`} aria-label={`Vista interactiva de ${project.title}`}>
      <div className="window-bar"><div className="window-title"><Icon size={17}/>{project.title.split(" ").slice(0, 4).join(" ")}</div><span>Demo Eon</span></div>
      <div className="window-toolbar"><b>{project.previewType === "automation" ? "Flujos activos" : "Vista operativa"}</b><button type="button" onClick={() => setEnabled(!enabled)}>{enabled ? "Activo" : "Pausado"}</button></div>
      <div className="mini-stats"><div><small>ESTADO GENERAL</small><strong>{enabled ? "En curso" : "Pausado"}</strong></div><div><small>REQUIERE ATENCIÓN</small><strong>{project.previewType === "works" ? "3" : "2"}</strong></div></div>
      <div className="data-table" role="list">{rows.map((row, index) => <button type="button" key={row.name} className={selected === index ? "data-row selected" : "data-row"} onClick={() => setSelected(index)} role="listitem"><span className="avatar">{selected === index ? <Check size={14}/> : row.name.slice(0, 2)}</span><span><b>{row.name}</b><small>{row.meta}</small></span><span className="status-dot">{row.status}</span><strong>{row.value}</strong></button>)}</div>
      <div className="next-step"><small>{enabled ? "DETALLE SELECCIONADO" : "FLUJO PAUSADO"}</small><p><b>{current?.name}</b> · {current?.meta}. <span>{enabled ? "Siguiente acción preparada." : "No se ejecutarán acciones."}</span></p></div>
      {large && <div className="preview-note"><CircleAlert size={16}/> Datos demostrativos. La estructura se adapta al proceso real.</div>}
    </div>
  );
}

export function HeroPreview() {
  const rows = previewRows.crm; const [selected, setSelected] = useState(0);
  return <div className="product-window hero-window" aria-label="Vista previa interactiva de un CRM inmobiliario">
    <div className="window-bar"><div className="window-title"><UsersRound size={17}/> Pipeline comercial</div><span>Demo Eon</span></div>
    <div className="window-toolbar"><b>Oportunidades</b><button type="button">+ Nuevo contacto</button></div>
    <div className="mini-stats"><div><small>PIPELINE ACTIVO</small><strong>€ 607.000</strong></div><div><small>PRÓXIMOS PASOS</small><strong>8</strong></div></div>
    <div className="data-table" role="list">{rows.map((row, index) => <button type="button" key={row.name} className={selected === index ? "data-row selected" : "data-row"} onClick={() => setSelected(index)} role="listitem"><span className="avatar">{row.name.split(" ").map((word) => word[0]).join("")}</span><span><b>{row.name}</b><small>{row.meta}</small></span><span className="status-dot">{row.status}</span><strong>{row.value}</strong></button>)}</div>
    <div className="next-step"><small>PRÓXIMO PASO</small><p>Llamar a <b>{rows[selected]?.name}</b> y confirmar requisitos de la visita.</p></div><div className="window-foot">Selecciona un contacto <ArrowUpRight size={14}/></div>
  </div>;
}
