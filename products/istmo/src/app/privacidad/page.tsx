import type { Metadata } from "next";
import { siteName } from "@/lib/site";

export const metadata: Metadata = { title: "Privacidad" };

export default function Privacy() {
  const name = siteName();
  return (
    <div className="page narrow">
      <article className="card document">
        <p className="eyebrow">Privacidad</p>
        <h1>Tus datos, con claridad</h1>
        <p>Texto inicial actualizado el 14 de septiembre de 2026. Antes del lanzamiento público deben completarse la identificación legal de quien opera {name} y su canal para ejercer derechos sobre los datos; esta página no los inventa.</p>
        <h2>Qué guardamos</h2>
        <ul>
          <li><b>Cuenta:</b> correo y contraseña cifrada, gestionados por el proveedor de autenticación (Supabase).</li>
          <li><b>Perfil público:</b> nombre, biografía, ubicación opcional y avatar.</li>
          <li><b>Participación:</b> propuestas, archivos adjuntos, apoyos, republicaciones, comentarios, novedades y reportes.</li>
          <li><b>Envíos:</b> tu lista de destinatarios, el asunto y mensaje enviados, su estado y, si lo autorizas, tu correo como dirección de respuesta.</li>
        </ul>
        <h2>Qué es público y qué no</h2>
        <p>Son públicos tu perfil, tus propuestas con sus archivos, comentarios, apoyos y republicaciones. <b>Tu correo nunca aparece en tu perfil ni en tus publicaciones.</b> Tu lista de destinatarios y el historial de envíos solo los ves tú (y moderación, si hay un reporte). Públicamente solo se indica que una propuesta fue «compartida con destinatarios».</p>
        <h2>Cuando envías una propuesta</h2>
        <p>La plataforma envía el correo desde su propio remitente verificado, a los destinatarios que eliges y tras tu confirmación. Solo si marcas la casilla correspondiente, tu correo se incluye como dirección de respuesta para que te contesten directamente. Los correos enviados quedan en los sistemas de sus destinatarios aunque después borres la propuesta.</p>
        <h2>Directorio de responsables</h2>
        <p>El directorio contiene canales institucionales y profesionales publicados por las propias entidades o por fuentes públicas, con su procedencia y fecha. No recopilamos datos privados. Si un dato es incorrecto o no debería figurar, usa «Reportar dato incorrecto».</p>
        <h2>Proveedores</h2>
        <p>Vercel (alojamiento), Supabase (base de datos, archivos y cuentas), Resend (envío de correo) y, si se habilita, Tavily (búsqueda web con el texto público de la propuesta). Usamos cookies de sesión para mantener tu acceso. No hay publicidad ni seguimiento comercial.</p>
        <h2>Tus decisiones</h2>
        <p>Puedes editar tu perfil y editar o eliminar tus propuestas, archivos, comentarios y novedades en cualquier momento. La solicitud de exportación o eliminación completa de la cuenta se atenderá por el canal de contacto que se publique en esta página.</p>
      </article>
    </div>
  );
}
