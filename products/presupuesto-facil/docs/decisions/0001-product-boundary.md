# ADR 0001: Producto aislado dentro de Eon Labs

## Estado

Aceptada para Foundation.

## Decisión

Presupuesto Fácil vive en `products/presupuesto-facil` como aplicación Next.js independiente. Vercel usa esa carpeta como Root Directory y los checks de GitHub filtran por su ruta.

## Motivo

El repositorio ya contiene la landing corporativa React/Vite con backend FastAPI. Reutilizar esas carpetas mezclaría ciclos de despliegue y obligaría a adaptar una SPA a requisitos de autenticación, renderizado en servidor y enlaces públicos seguros.

## Consecuencia

La landing existente no cambia. El repositorio funciona como monorepo ligero sin introducir una herramienta de orquestación hasta que exista una necesidad real.
