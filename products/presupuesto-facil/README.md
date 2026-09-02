# Presupuesto Fácil

Aplicación de Eon Labs para crear, compartir y registrar la respuesta a un presupuesto en pocos minutos.

## Desarrollo local

Requisitos: Node.js 24, npm y Docker Desktop para el stack local de Supabase.

1. Copia `.env.example` a `.env.local` y usa las credenciales mostradas por `npm run supabase:start`.
2. Ejecuta `npm install`.
3. Ejecuta `npm run supabase:start` y `npm run supabase:reset`.
4. Ejecuta `npm run dev`.

La aplicación queda en `http://localhost:3000` y Supabase Studio en `http://127.0.0.1:54323`.

El acceso es por enlace mágico y no usa contraseñas. Las altas públicas permanecen cerradas: un administrador invita primero al usuario desde Supabase Auth y después el usuario solicita el enlace desde la pantalla de acceso.

## Comprobaciones

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx supabase test db
```

Las migraciones son la fuente de verdad del esquema. No se aplican cambios manuales a producción y nunca se usan datos reales en desarrollo o preview.

Consulta `docs/implementation-plan.md` para el alcance y `docs/runbook.md` para despliegue y recuperación.
