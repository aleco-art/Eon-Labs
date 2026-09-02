# Runbook

## Entornos

- Local: Supabase CLI y datos ficticios.
- Preview: proyecto Supabase no productivo y deployments de pull requests.
- Producción: proyecto Supabase independiente y deployment promovido manualmente.

Nunca se conecta una preview a producción y nunca se ejecuta `db reset --linked` contra producción.

## Despliegue

1. Revisar la migración y ejecutar lint, typecheck, tests y build.
2. Aplicar migraciones primero al proyecto de preview.
3. Revisar la preview en móvil y escritorio.
4. Aplicar la migración de producción sólo después de aprobación.
5. Promover el deployment verificado en Vercel.

## Rollback

El código vuelve al deployment anterior desde Vercel. Las migraciones de datos son progresivas: una reversión destructiva requiere una migración compensatoria revisada y backup verificado. No se editan tablas manualmente para simular un rollback.

## Incidente

Revocar enlaces afectados, desactivar temporalmente la ruta vulnerable, preservar logs sin datos sensibles, identificar la migración/deployment y documentar causa y recuperación antes de reabrir acceso.
