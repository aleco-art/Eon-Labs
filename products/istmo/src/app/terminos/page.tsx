import type { Metadata } from "next";
import { siteName } from "@/lib/site";

export const metadata: Metadata = { title: "Términos" };

export default function Terms() {
  const name = siteName();
  return (
    <div className="page narrow">
      <article className="card document">
        <p className="eyebrow">Términos de uso</p>
        <h1>Un espacio para proponer</h1>
        <p>Texto inicial actualizado el 14 de septiembre de 2026. La identificación legal del operador debe completarse antes del lanzamiento público.</p>
        <h2>Qué es {name}</h2>
        <p>Una plataforma para publicar propuestas, reunir apoyo de la comunidad y hacerlas llegar a entidades, organizaciones y profesionales que podrían impulsarlas. <b>{name} no aprueba propuestas, no garantiza respuestas ni su ejecución y no representa a ninguna entidad.</b> Los apoyos expresan interés y no son una votación oficial.</p>
        <h2>Tu contenido</h2>
        <p>Publica contenido propio o que tengas derecho a compartir. Conservas la autoría y autorizas que se muestre y se republique dentro de la plataforma. No publiques spam, amenazas, suplantaciones, datos privados de terceros ni archivos dañinos o inapropiados.</p>
        <h2>Envío a responsables</h2>
        <ul>
          <li>Revisa destinatarios, asunto, mensaje y archivos antes de confirmar. El correo sale del remitente de la plataforma e indica que lo envías tú como autor.</li>
          <li>Hay límites de envío para evitar spam: hasta 10 destinatarios por envío, 20 correos al día por cuenta y un solo envío por destinatario y propuesta cada 30 días. Los apoyos nunca generan correos.</li>
          <li>«Aceptado» significa que el proveedor recibió el correo y «entregado», que lo aceptó el servidor del destinatario. Ninguno implica lectura ni respuesta.</li>
          <li>Abrir el portal de una entidad no registra la propuesta en él. Algunos trámites, como una iniciativa de ley, tienen requisitos formales propios que un correo no sustituye.</li>
        </ul>
        <h2>Moderación</h2>
        <p>Se puede ocultar contenido que incumpla estas reglas y atender reportes de abuso o de datos incorrectos. La moderación trata la convivencia y la seguridad; no evalúa el mérito de las ideas.</p>
      </article>
    </div>
  );
}
