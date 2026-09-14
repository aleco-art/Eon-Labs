# Istmo

Plataforma ciudadana para publicar propuestas en Panamá, conversar sobre ellas y localizar destinatarios que podrían impulsarlas. Istmo no aprueba ni ejecuta propuestas y no representa a las entidades sugeridas.

## Funciones

- Cuentas independientes con perfiles públicos y datos privados separados.
- Propuestas por temática, provincia o comarca, distrito y corregimiento.
- Adjuntos públicos con validación de tipo, firma de archivo y límites de tamaño.
- Likes únicos, republicaciones vinculadas al original, comentarios y respuestas.
- Directorio con fuente y fecha de consulta, búsqueda enfocada y modo ampliado.
- Revisión de destinatarios, mensaje y adjuntos antes de enviar.
- Estados de correo diferenciados: pendiente, aceptado, entregado, fallido o incierto.
- Reportes y moderación de contenido separada del mérito de la propuesta.

## Datos de Panamá

Los selectores se generan desde la capa pública de corregimientos del Instituto Geográfico Nacional Tommy Guardia. La descarga consultada el 14 de septiembre de 2026 contiene 730 polígonos y 699 códigos territoriales únicos, en 83 agrupaciones cartográficas de distrito y 13 provincias o comarcas. Consulta `/fuentes` para la metodología y las limitaciones, incluidas Guna Yala y Naso Tjër Di.

Regenerar los datos desde la copia de origen incluida:

```bash
node scripts/prepare-territories.mjs
```

## Desarrollo

Requiere Node.js 20 o posterior, Docker y Supabase CLI para las pruebas locales.

```bash
npm install
npx supabase start
npx supabase db reset
npm run dev
```

Copia `.env.example` a `.env.local` y añade los valores del proyecto de Supabase. No confirmes envíos reales durante desarrollo.

## Base de datos y permisos

Las migraciones están en `supabase/migrations`. Todas las tablas con datos de usuarios tienen RLS. El navegador recibe únicamente la clave pública; `SUPABASE_SERVICE_ROLE_KEY` queda en el servidor. La prueba `supabase/tests/security.sql` crea dos identidades temporales, comprueba la visibilidad compartida y bloquea la edición ajena y los likes duplicados.

Ejecutarla contra Supabase local:

```powershell
Get-Content supabase/tests/security.sql | docker exec -i supabase_db_istmo-local psql -v ON_ERROR_STOP=1 -U postgres -d postgres
```

## Investigación de contactos

La búsqueda usa primero el directorio y una caché de siete días. Con `TAVILY_API_KEY`, ejecuta consultas por temática y jurisdicción, respeta `robots.txt`, limita la extracción a dominios institucionales revisados y bloquea destinos de red privados. Los resultados no corroborados se identifican en pantalla.

- Estándar: hasta 3 consultas, 6 páginas y 120 segundos acumulados.
- Ampliada: hasta 6 consultas, 12 páginas y 240 segundos acumulados.
- Tokens de modelo: 0 en esta versión; el filtrado inicial usa reglas y extracción determinista.

Los avances se guardan en `research_jobs`. Para procesar trabajos interrumpidos puede invocarse `scripts/research-worker.mjs` desde un servicio autorizado. No se programa ningún rastreo periódico por defecto.

## Correo

Configura Resend con un dominio y remitente verificados. La aplicación crea un registro antes del envío, usa claves de idempotencia, limita cada cuenta a cinco correos diarios y evita repetir un destinatario en 24 horas. Configura el webhook en `/api/webhooks/resend` para registrar confirmaciones de entrega y rebotes.

## Variables

Consulta `.env.example`. En producción son obligatorias las variables de Supabase, la URL pública y el secreto interno. Tavily y Resend son opcionales hasta que se habiliten sus funciones. Nunca publiques el archivo con valores reales.

## Comprobaciones

```bash
npm run lint
npm run build
```

La entrega se verificó además con dos sesiones locales: ambas vieron la misma propuesta; solo la autora recibió controles de edición; likes, republicaciones y comentarios persistieron tras recargar.
