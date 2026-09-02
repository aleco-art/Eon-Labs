# ADR 0002: Seguridad pública y representación monetaria

## Estado

Aceptada para el MVP.

## Decisión

- Los importes se almacenan como enteros en céntimos y los tipos impositivos con precisión decimal explícita.
- Los tokens públicos se generan con un CSPRNG; se persiste únicamente SHA-256 del token.
- El navegador nunca recibe `service_role` ni consulta tablas mediante un token público.
- Autorización en servidor y RLS forman capas independientes.
- Preview y producción usan proyectos Supabase distintos.

## Consecuencia

Los cálculos son deterministas, una filtración de base de datos no revela enlaces reutilizables y las pruebas deben cubrir accesos permitidos y denegados.
