# Istmo

Plataforma ciudadana para Panamá: cualquier persona publica una propuesta, la comunidad la apoya y el autor la envía, desde la propia web, a los responsables del área (municipios, oficinas regionales, entidades nacionales y organizaciones). Istmo no aprueba propuestas, no garantiza su ejecución y no representa a ninguna entidad. El nombre es provisional (`NEXT_PUBLIC_SITE_NAME`).

## Funciones

- **Cuentas reales** con Supabase Auth: registro con confirmación por correo, inicio y cierre de sesión, recuperación de contraseña. Perfil público con nombre, avatar, biografía y ubicación opcional. El correo nunca es público.
- **Propuestas** con título, texto, temática, alcance (todo Panamá o ubicación), provincia/comarca → distrito → corregimiento dependientes, y hasta 5 imágenes o PDF públicos (10 MB, tipo y firma de archivo validados).
- **Feed** con búsqueda sin tildes, filtros por temática, alcance, territorio y fecha, y orden por fecha o popularidad; paginación en servidor.
- **Interacciones persistentes**: un apoyo por persona (se puede retirar), comentarios y respuestas, republicaciones enlazadas al original con su autoría, enlace para compartir. Los contadores los calcula la base de datos.
- **Envío a responsables por área**: sugerencias según temática, jurisdicción y calidad del canal; lista persistente por propuesta; alta manual; revisión de destinatarios, asunto, mensaje, enlace y archivos; consentimiento para usar el correo del autor como respuesta; envío individual desde el remitente verificado de la plataforma; estados reales (aceptado, entregado, rebotado, fallido, por confirmar); límites anti-spam. Los portales sin correo se abren con un texto preparado y **no** cuentan como envío.
- **Seguimiento sin aprobación**: estados «Publicada» y «Compartida con destinatarios»; novedades y respuestas recibidas aportadas por el autor.
- **Moderación** separada del mérito: reportes de propuestas, comentarios, archivos y datos del directorio; ocultar/restaurar; registro de acciones.
- **Fuentes y actualización** (`/fuentes`) con registro de procedencia, cobertura, discrepancias y límites.

## Stack

Next.js 16 (App Router, TypeScript), Tailwind CSS 4 + CSS propio (colores de la bandera, DM Sans), Supabase (PostgreSQL con RLS, Auth, Storage), Resend (correo), Vercel.

## Desarrollo local

Requisitos: Node.js 20+, Docker y Python 3 con `pdfplumber` solo si vas a regenerar el directorio municipal.

```bash
npm install
npx supabase start          # Postgres, Auth, Storage y Mailpit en los puertos 554xx
npx supabase db reset       # aplica supabase/migrations (esquema, territorios, directorio)
cp .env.example .env.local  # completa las claves que imprime `npx supabase status`
npm run dev -- -p 3100
```

- App: http://localhost:3100 · Buzón de pruebas (Mailpit): http://127.0.0.1:55424
- Con `EMAIL_PROVIDER=smtp` los correos de propuestas y de autenticación se quedan en Mailpit: nada sale a terceros.

## Base de datos

`supabase/migrations`:

| Archivo | Contenido |
| --- | --- |
| `001_istmo.sql` | Perfiles, propuestas, interacciones, adjuntos, reportes, envíos, límites, RLS y buckets |
| `002_territories.sql` | 699 corregimientos del IGN «Tommy Guardia» con códigos |
| `003_platform_v2.sql` | Corrección de la política de lectura de adjuntos, búsqueda sin tildes, contadores, límites diarios en la base de datos, directorio `responsables`, listas `proposal_recipients`, moderación de archivos y registro |
| `004_directory_seed.sql` | Directorio generado (109 responsables) y alias territoriales |

Todas las tablas tienen RLS. El navegador solo usa la clave pública; `SUPABASE_SERVICE_ROLE_KEY` se usa en rutas del servidor para registrar envíos, moderar y ejecutar investigaciones.

## Directorio de responsables

Fuentes y método documentados en `/fuentes`. Para actualizarlo:

```bash
npm run directory:crawl                               # rastreo cortés de los sitios en scripts/directory/seeds.json
python scripts/directory/amupa.py <PDF de AMUPA>       # municipios desde el directorio de alcaldes
# revisar evidencias y editar scripts/directory/curated.json
npm run directory:build                               # genera 004_directory_seed.sql y src/data/directory-coverage.json
```

`crawl-results.json` no se versiona: contiene buzones nominales que no se importan.

## Administración

Nombrar moderador (SQL editor de Supabase):

```sql
insert into public.moderators (user_id)
select id from auth.users where email = 'persona@dominio.com';
```

La sección `/moderacion` solo aparece para moderadores. Los datos del directorio reportados pasan a estado `revisar`.

## Pruebas

```bash
npm run lint && npm run build
SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:rls   # 48 comprobaciones de permisos
SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:e2e   # flujo completo con dos navegadores
```

Ambas pruebas se niegan a ejecutarse fuera de `localhost`. `test:e2e` necesita la app en el puerto 3100 con `EMAIL_PROVIDER=smtp` y detiene Mailpit unos segundos para comprobar el registro de un envío fallido.

## Despliegue en Vercel

1. Proyecto con **Root Directory** `products/istmo`.
2. Aplicar las migraciones al proyecto de Supabase (`npx supabase link --project-ref <ref>` y `npx supabase db push`) **antes** de desplegar código que las necesite.
3. Variables de entorno (Production y Preview): las de `.env.example` con `EMAIL_PROVIDER=resend`.
4. Supabase → Authentication → URL Configuration: *Site URL* = URL pública; *Redirect URLs* = `https://<dominio>/auth/callback`.
5. Supabase → Authentication → SMTP: usar el SMTP de Resend (el correo por defecto de Supabase solo entrega a miembros del equipo). Copiar las plantillas de `supabase/templates`.
6. Resend: verificar el dominio del remitente y crear un webhook a `https://<dominio>/api/webhooks/resend` con los eventos `email.delivered`, `email.bounced` y `email.failed`.

## Límites de uso

Por cuenta y día: 10 propuestas, 60 comentarios, 300 apoyos, 100 republicaciones, 20 novedades, 20 reportes, 60 destinatarios guardados, 20 correos y 10 investigaciones web. Hasta 10 destinatarios por envío y un envío por destinatario y propuesta cada 30 días. Los apoyos nunca generan correos.
