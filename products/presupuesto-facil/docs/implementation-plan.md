# Implementation plan

El trabajo avanza por slices demostrables. Cada slice termina con checks, evidencia, preview y aprobación humana antes de ampliar alcance.

## Slice 0 — Foundation

- Next.js App Router aislado en `products/presupuesto-facil`.
- Variables de entorno validadas sin secretos en el cliente.
- Supabase Auth sin registro público, perfil mínimo, RLS y migraciones.
- Login, cierre de sesión, panel protegido y datos de demostración.
- GitHub Actions con lint, typecheck, tests y build.
- Proyectos separados para preview y producción; Vercel conectado a GitHub.

Demostración: un usuario autorizado inicia sesión en la preview y un visitante anónimo no abre `/dashboard`.

## Slice 1 — Core loop

Cliente, presupuesto sencillo, conceptos, cálculo seguro en céntimos, borrador, token público, consulta, aceptación y estado interno actualizado.

## Slice 2 — Workflow

Listado, edición de borradores, revisión, estados restantes, rechazo con comentario e historial completo.

## Slice 3 — Integridad y seguridad

Inmutabilidad tras compartir, duplicado como versión nueva, caducidad, revocación y pruebas completas de autorización, RLS y transiciones.

## Slice 4 — Preparación para piloto

Responsive, accesibilidad, estados de interfaz, monitorización mínima, documentación operativa, backup, recuperación y preview final.

## Dependencias elegidas

- `@supabase/ssr` y `@supabase/supabase-js`: sesión cookie-based y acceso a Auth/Postgres. Es el SDK oficial; implementar sesiones propias aumenta riesgo.
- `zod`: validación compartida de configuración y entradas no confiables. Las comprobaciones manuales se vuelven frágiles al crecer los formularios.
- `lucide-react`: iconos accesibles y consistentes; evita SVG ad hoc.
- `vitest`: pruebas TypeScript rápidas para reglas puras. El runner nativo exigiría una capa adicional para transformar TypeScript.
- Supabase CLI: migraciones, entorno local y pruebas pgTAP reproducibles.
