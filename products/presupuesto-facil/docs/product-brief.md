# Product brief

## Usuario principal

Instaladores, profesionales de mantenimiento y empleados autorizados de pequeñas empresas españolas. El cliente final recibe el presupuesto, pero no crea una cuenta.

## Problema

Los presupuestos se preparan en documentos manuales, se comparten por canales dispersos y requieren perseguir al cliente para conocer su decisión. El profesional pierde tiempo y no dispone de un estado fiable.

## Proceso actual

Recoger datos por teléfono o mensajería, redactar un documento, calcular importes manualmente, enviarlo y preguntar repetidamente si fue visto o aceptado.

## Resultado deseado y métrica

El profesional crea y comparte un presupuesto en menos de cinco minutos. El cliente lo consulta y responde en menos de un minuto. El piloto debe incluir al menos cinco presupuestos reales y una aceptación o rechazo sin errores críticos.

## Flujo principal

Inicio de sesión, selección o alta de cliente, creación del presupuesto, conceptos y cálculo, borrador, revisión, enlace público seguro, visualización, aceptación o rechazo y estado actualizado en el área interna.

## Alcance

- Autenticación de usuarios internos autorizados.
- Clientes y presupuestos con importes en EUR y locale `es-ES`.
- Estados `draft`, `shared`, `viewed`, `accepted`, `rejected` y `expired`.
- Enlace público revocable y con caducidad.
- Comentario del cliente e historial mínimo de eventos.
- Configuración básica del negocio.

## No alcance

Facturación oficial, pagos, contabilidad, firma cualificada, automatización de correo o WhatsApp, CRM completo, calendario, trabajos, catálogo avanzado, adjuntos, multidioma, app nativa, IA, analítica, suscripciones, multi-tenancy e integraciones no esenciales.

## Riesgos

- Filtración de datos por una política RLS incompleta.
- Tokens públicos predecibles o almacenados en texto plano.
- Errores de redondeo monetario.
- Modificación de importes después de compartir.
- Mezcla accidental de datos entre preview y producción.

## Criterios de aceptación

- Un usuario anónimo no accede al área interna.
- Un enlace público sólo revela su presupuesto sanitizado.
- Las transiciones inválidas y ediciones bloqueadas se rechazan en servidor.
- Cálculos, autorizaciones y RLS tienen pruebas positivas y negativas.
- Lint, typecheck, tests, build y migraciones reproducibles pasan.
- Existe preview separada de producción y documentación de rollback.
