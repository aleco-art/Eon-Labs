export type ProjectCategory = "clientes" | "operaciones" | "administracion" | "educacion" | "automatizacion" | "web";
export type PreviewType = "crm" | "academy" | "works" | "distribution" | "automation";

export type Project = {
  slug: string; title: string; category: ProjectCategory; audience: string[]; summary: string; problem: string;
  howItWorks: string[]; features: string[]; useCases: string[]; industries: string[]; customization: string[];
  tags: string[]; status: "demo"; featured: boolean; previewType: PreviewType;
  seo: { title: string; description: string };
};

export const categoryLabels: Record<ProjectCategory, string> = {
  clientes: "Clientes", operaciones: "Operaciones", administracion: "Administración",
  educacion: "Educación", automatizacion: "Automatización", web: "Web",
};

export const projects: Project[] = [
  {
    slug: "crm-inmobiliario", title: "CRM para agentes inmobiliarios", category: "clientes",
    audience: ["Agentes inmobiliarios", "Pequeños equipos comerciales"],
    summary: "Leads, propiedades y próximos pasos en una vista que el equipo puede mantener al día.",
    problem: "Los leads, las propiedades y los seguimientos suelen quedar repartidos entre WhatsApp, hojas de cálculo y memoria.",
    howItWorks: ["Centraliza cada contacto y su propiedad de interés.", "Muestra la etapa actual y el próximo paso.", "Mantiene notas e historial junto a la oportunidad."],
    features: ["Contactos", "Propiedades", "Pipeline", "Tareas", "Notas", "Recordatorios", "Historial"],
    useCases: ["Ordenar consultas nuevas", "Preparar visitas", "Evitar seguimientos olvidados"],
    industries: ["Inmobiliaria", "Servicios profesionales"], customization: ["Etapas comerciales propias", "Campos por tipo de propiedad", "Recordatorios y reportes"],
    tags: ["CRM", "Pipeline", "Seguimiento"], status: "demo", featured: true, previewType: "crm",
    seo: { title: "CRM inmobiliario adaptable | Eon Labs", description: "Demo de un CRM simple para organizar contactos, propiedades y seguimientos inmobiliarios." },
  },
  {
    slug: "gestion-academia-idiomas", title: "Gestión para academia de idiomas", category: "educacion",
    audience: ["Academias pequeñas", "Profesores particulares"],
    summary: "Alumnos, grupos, asistencia y pagos organizados sin saltar entre varias hojas.",
    problem: "Alumnos, clases, asistencia y pagos se gestionan en lugares distintos y cuesta ver qué necesita atención.",
    howItWorks: ["Organiza alumnos por grupo y profesor.", "Permite registrar asistencia desde cada clase.", "Señala pagos pendientes y próximas sesiones."],
    features: ["Alumnos", "Profesores", "Grupos", "Horarios", "Asistencia", "Pagos", "Materiales"],
    useCases: ["Preparar clases", "Controlar asistencia", "Revisar cobros"], industries: ["Educación", "Formación"], customization: ["Niveles y grupos propios", "Reglas de asistencia", "Ciclos de pago"],
    tags: ["Alumnos", "Clases", "Pagos"], status: "demo", featured: true, previewType: "academy",
    seo: { title: "Gestión para academias de idiomas | Eon Labs", description: "Demo para organizar alumnos, clases, asistencia y pagos en una academia pequeña." },
  },
  {
    slug: "seguimiento-obras", title: "Seguimiento de obras", category: "operaciones",
    audience: ["Ingenieros civiles", "Arquitectos", "Equipos de obra"],
    summary: "Avances, visitas y pendientes de cada obra en un tablero operativo compartido.",
    problem: "Avances, pendientes, documentos y visitas quedan repartidos y cuesta conocer el estado real de cada obra.",
    howItWorks: ["Resume etapa y avance por proyecto.", "Reúne pendientes con responsable y fecha.", "Registra visitas, incidencias y documentos."],
    features: ["Proyectos", "Hitos", "Tareas", "Visitas", "Archivos", "Incidencias", "Avance"],
    useCases: ["Preparar visita de obra", "Priorizar incidencias", "Informar avances"], industries: ["Construcción", "Arquitectura"], customization: ["Etapas por tipo de obra", "Plantillas de visita", "Reportes de avance"],
    tags: ["Obras", "Avance", "Incidencias"], status: "demo", featured: true, previewType: "works",
    seo: { title: "Seguimiento digital de obras | Eon Labs", description: "Demo para organizar avances, visitas, responsables y pendientes de obras." },
  },
  {
    slug: "control-distribuidora", title: "Control operativo para distribuidora", category: "administracion",
    audience: ["Pequeñas distribuidoras", "Comercios con inventario"],
    summary: "Pedidos, entregas, stock y cobros con alertas claras para el trabajo del día.",
    problem: "Pedidos, stock, entregas y cobros no comparten una vista y los equipos reaccionan tarde ante faltantes o retrasos.",
    howItWorks: ["Agrupa pedidos por estado de preparación.", "Muestra alertas de stock y cobro.", "Ordena entregas por fecha y responsable."],
    features: ["Inventario", "Pedidos", "Clientes", "Entregas", "Cobros", "Dashboard"],
    useCases: ["Preparar pedidos", "Coordinar entregas", "Detectar faltantes"], industries: ["Distribución", "Comercio"], customization: ["Estados de pedido", "Catálogo e inventario", "Rutas y condiciones de cobro"],
    tags: ["Pedidos", "Stock", "Entregas"], status: "demo", featured: true, previewType: "distribution",
    seo: { title: "Control operativo para distribuidoras | Eon Labs", description: "Demo para conectar pedidos, inventario, entregas y cobros." },
  },
  {
    slug: "automatizacion-administrativa", title: "Automatización administrativa", category: "automatizacion",
    audience: ["Autónomos", "Pequeños negocios", "Equipos administrativos"],
    summary: "Reglas visibles para copiar datos, enviar recordatorios y evitar pasos repetidos.",
    problem: "Copiar datos, enviar recordatorios y repetir los mismos pasos consume tiempo y crea errores evitables.",
    howItWorks: ["Define un evento que inicia el flujo.", "Ejecuta pasos y reglas en orden.", "Registra cada ejecución y cualquier incidencia."],
    features: ["Formularios", "Reglas", "Recordatorios", "Actualizaciones", "Integraciones", "Registro"],
    useCases: ["Recordar pagos", "Copiar solicitudes", "Actualizar estados"], industries: ["Servicios", "Administración"], customization: ["Desencadenantes propios", "Mensajes y destinatarios", "Conexiones entre herramientas"],
    tags: ["Flujos", "Reglas", "Integraciones"], status: "demo", featured: true, previewType: "automation",
    seo: { title: "Automatización administrativa | Eon Labs", description: "Demo de un flujo para reducir tareas administrativas repetitivas." },
  },
];

export const getProject = (slug: string | undefined) => projects.find((project) => project.slug === slug);
