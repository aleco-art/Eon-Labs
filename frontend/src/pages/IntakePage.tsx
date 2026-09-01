import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Pencil } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Seo } from "../components/Seo";
import { siteConfig } from "../config";
import { getProject, projects } from "../data/projects";

type FormData = { intention: string; businessType: string; improvements: string[]; current: string; problem: string; tools: string; project: string; package: string; name: string; business: string; phone: string; email: string; preferred: string };
const businessTypes = ["Academia o educación", "Profesional independiente", "Comercio o ferretería", "Inmobiliaria", "Distribuidora", "Servicios", "Otro"];
const improvements = ["Clientes y seguimiento", "Organización interna", "Tareas repetitivas", "Información y reportes", "Ventas", "Administración", "Web o presencia digital", "Integración de herramientas", "No estoy seguro"];

function Choice({ selected, children, onClick, multiple = false }: { selected: boolean; children: React.ReactNode; onClick: () => void; multiple?: boolean }) {
  return <button type="button" className={`choice ${selected ? "selected" : ""}`} aria-pressed={selected} onClick={onClick}><span>{selected && <Check size={15}/>}</span>{children}{multiple && <small>Selección múltiple</small>}</button>;
}

export function IntakePage() {
  const [params] = useSearchParams(); const initialProject = getProject(params.get("proyecto") ?? undefined)?.slug ?? "";
  const initialPackage = ["base", "adaptado", "a-medida"].includes(params.get("paquete") ?? "") ? (params.get("paquete") ?? "") : "";
  const [step, setStep] = useState(1); const [errors, setErrors] = useState<Record<string, string>>({}); const errorRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormData>({ intention: "", businessType: "", improvements: [], current: "", problem: "", tools: "", project: initialProject, package: initialPackage, name: "", business: "", phone: "", email: "", preferred: "WhatsApp" });
  const update = (key: keyof FormData, value: string | string[]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleImprovement = (value: string) => update("improvements", form.improvements.includes(value) ? form.improvements.filter((item) => item !== value) : [...form.improvements, value]);
  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (step === 1 && !form.intention) nextErrors.intention = "Elige cómo quieres empezar.";
    if (step === 2 && !form.businessType) nextErrors.businessType = "Selecciona el tipo de negocio.";
    if (step === 3 && !form.improvements.length) nextErrors.improvements = "Selecciona al menos un área.";
    if (step === 4) { if (!form.current.trim()) nextErrors.current = "Cuéntanos cómo lo haces ahora."; if (!form.problem.trim()) nextErrors.problem = "Describe el problema principal."; }
    if (step === 5) { if (!form.name.trim()) nextErrors.name = "Escribe tu nombre."; if (!form.phone.trim()) nextErrors.phone = "Escribe un número de WhatsApp."; }
    setErrors(nextErrors); if (Object.keys(nextErrors).length) { queueMicrotask(() => errorRef.current?.focus()); return false; } return true;
  };
  const next = () => { if (validate()) setStep((current) => Math.min(6, current + 1)); };
  const selectedProject = getProject(form.project);
  const message = useMemo(() => [
    "Hola Eon Labs. Quiero conversar sobre una herramienta digital.", "", `Intención: ${form.intention}`, `Tipo de negocio: ${form.businessType}`,
    `Quiero mejorar: ${form.improvements.join(", ")}`, `Situación actual: ${form.current}`, `Problema principal: ${form.problem}`,
    form.tools ? `Herramientas actuales: ${form.tools}` : "", selectedProject ? `Demo de referencia: ${selectedProject.title}` : "", form.package ? `Paquete de interés: ${form.package}` : "",
    "", `Nombre: ${form.name}`, form.business ? `Negocio: ${form.business}` : "", `WhatsApp: ${form.phone}`, form.email ? `Email: ${form.email}` : "", `Método preferido: ${form.preferred}`,
  ].filter(Boolean).join("\n"), [form, selectedProject]);
  const launchWhatsApp = () => { if (!siteConfig.whatsappNumber) return; window.open(`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer"); };

  return <><Seo title="Empezar un proyecto | Eon Labs" description="Un brief guiado para entender qué proceso necesitas ordenar y preparar una conversación útil." path="/empezar"/>
    <section className="intake-shell section-pad"><div className="intake-aside"><Link className="breadcrumb" to="/"><ArrowLeft size={15}/> Volver a Eon Labs</Link><p className="eyebrow">BRIEF INICIAL</p><h1>Cuéntanos cómo trabajas.</h1><p>No necesitas saber qué software pedir. Este recorrido organiza el contexto para empezar una conversación útil.</p><div className="progress-track"><span style={{ width: `${(step / 6) * 100}%` }}/></div><p className="step-label">Paso {step} de 6</p></div>
      <div className="wizard-card"><div ref={errorRef} tabIndex={-1} className="error-summary" aria-live="polite">{Object.values(errors)[0]}</div>
        {step === 1 && <fieldset><legend>¿Cómo quieres empezar?</legend><p className="field-help">Elige la opción que mejor describe tu momento.</p><div className="choice-grid"><Choice selected={form.intention === "Estoy explorando"} onClick={() => update("intention", "Estoy explorando")}>Estoy explorando<small>Quiero entender posibilidades.</small></Choice><Choice selected={form.intention === "Quiero construir algo"} onClick={() => update("intention", "Quiero construir algo")}>Quiero construir algo<small>Tengo un problema concreto.</small></Choice></div></fieldset>}
        {step === 2 && <fieldset><legend>¿Qué tipo de negocio tienes?</legend><p className="field-help">Nos ayuda a interpretar el proceso y el lenguaje.</p><div className="choice-grid compact-choices">{businessTypes.map((item) => <Choice key={item} selected={form.businessType === item} onClick={() => update("businessType", item)}>{item}</Choice>)}</div></fieldset>}
        {step === 3 && <fieldset><legend>¿Qué quieres mejorar?</legend><p className="field-help">Puedes elegir varias áreas.</p><div className="choice-grid compact-choices">{improvements.map((item) => <Choice key={item} selected={form.improvements.includes(item)} onClick={() => toggleImprovement(item)} multiple>{item}</Choice>)}</div></fieldset>}
        {step === 4 && <fieldset><legend>¿Cómo funciona hoy?</legend><p className="field-help">Describe el trabajo tal como ocurre ahora.</p><label>¿Cómo haces esto actualmente? <span>Obligatorio</span><textarea value={form.current} onChange={(event) => update("current", event.target.value)} aria-invalid={!!errors.current}/>{errors.current && <small className="field-error">{errors.current}</small>}</label><label>¿Cuál es el principal problema? <span>Obligatorio</span><textarea value={form.problem} onChange={(event) => update("problem", event.target.value)} aria-invalid={!!errors.problem}/>{errors.problem && <small className="field-error">{errors.problem}</small>}</label><label>¿Qué herramientas usas hoy? <span>Opcional</span><input value={form.tools} onChange={(event) => update("tools", event.target.value)} placeholder="Excel, WhatsApp, papel…"/></label><label>¿Hay algo del showroom parecido? <span>Opcional</span><select value={form.project} onChange={(event) => update("project", event.target.value)}><option value="">Ninguna o no estoy seguro</option>{projects.map((project) => <option key={project.slug} value={project.slug}>{project.title}</option>)}</select></label><label>Paquete de interés <span>Opcional</span><select value={form.package} onChange={(event) => update("package", event.target.value)}><option value="">Sin seleccionar</option><option value="base">Base</option><option value="adaptado">Adaptado</option><option value="a-medida">A medida</option></select></label></fieldset>}
        {step === 5 && <fieldset><legend>¿Cómo podemos contactarte?</legend><p className="field-help">WhatsApp es el método inicial por defecto.</p><label>Nombre <span>Obligatorio</span><input value={form.name} onChange={(event) => update("name", event.target.value)} aria-invalid={!!errors.name}/>{errors.name && <small className="field-error">{errors.name}</small>}</label><label>Negocio <span>Opcional</span><input value={form.business} onChange={(event) => update("business", event.target.value)}/></label><label>WhatsApp <span>Obligatorio</span><input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} aria-invalid={!!errors.phone}/>{errors.phone && <small className="field-error">{errors.phone}</small>}</label><label>Email <span>Opcional</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)}/></label><label>Método preferido<select value={form.preferred} onChange={(event) => update("preferred", event.target.value)}><option>WhatsApp</option><option>Email</option></select></label></fieldset>}
        {step === 6 && <div className="review"><div><p className="eyebrow">REVISIÓN</p><h2>Revisa el brief antes de continuar.</h2><p>Podrás revisar el mensaje y pulsar Enviar en WhatsApp.</p></div>{[["Intención", form.intention, 1], ["Negocio", form.businessType, 2], ["Qué mejorar", form.improvements.join(", "), 3], ["Situación", form.current, 4], ["Contacto", `${form.name} · ${form.phone}`, 5]].map(([label, value, editStep]) => <article key={String(label)}><div><small>{label}</small><p>{value}</p></div><button type="button" onClick={() => setStep(Number(editStep))}><Pencil size={15}/> Editar</button></article>)}<label className="message-preview">Mensaje preparado<textarea readOnly value={message}/></label>{siteConfig.whatsappNumber ? <button type="button" className="button button-accent submit-brief" onClick={launchWhatsApp}>Abrir en WhatsApp <ArrowRight size={17}/></button> : <div className="config-warning"><CircleAlert/><div><strong>WhatsApp pendiente de configuración.</strong><p>El brief está listo, pero falta el número real de Eon. No se ha enviado nada.</p></div></div>}</div>}
        <div className="wizard-actions">{step > 1 ? <button type="button" className="back-button" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16}/> Atrás</button> : <span/>}{step < 6 && <button type="button" className="button button-dark" onClick={next}>Continuar <ArrowRight size={16}/></button>}</div>
      </div></section>
  </>;
}
