import type { Metadata } from "next";
import Link from "next/link";
import { siteName } from "@/lib/site";

export const metadata: Metadata = { title: "Cómo funciona" };

export default function HowItWorks() {
  const name = siteName();
  return (
    <div className="page narrow">
      <article className="card document">
        <p className="eyebrow">Cómo funciona</p>
        <h1>Propones tú. Te ayudamos a que llegue a quien le interesa.</h1>
        <h2>1. Haz una propuesta que te interesaría</h2>
        <p>Cualquier tema: gobierno local, urbanismo, eventos, turismo, cultura, gastronomía, medioambiente, deportes, emprendimiento y más. Indica si es para todo Panamá o para una provincia, distrito o corregimiento, y añade imágenes o PDF si ayudan.</p>
        <h2>2. La comunidad la apoya</h2>
        <p>Otras personas pueden apoyarla, comentarla, responder y republicarla. Todo queda guardado y visible para quien la visite.</p>
        <h2>3. Envíala a los responsables del área</h2>
        <p>En tu propuesta verás responsables sugeridos según la temática y la ubicación: el municipio del distrito, la oficina regional o la entidad nacional competente, y gremios u organizaciones del sector. Cada uno muestra su correo publicado, la fuente y la fecha de consulta.</p>
        <p>Eliges destinatarios, revisas el mensaje y confirmas. <b>La plataforma envía el correo por ti</b> desde su remitente verificado; no tienes que escribirles uno por uno. Si lo autorizas, pueden responderte directamente.</p>
        <h2>4. Cuenta cómo avanza</h2>
        <p>Publica novedades y las respuestas que recibas. Se muestran como información aportada por ti.</p>
        <h2>Lo que {name} no hace</h2>
        <ul>
          <li>No aprueba ni rechaza propuestas, ni garantiza su ejecución.</li>
          <li>No representa a las entidades del directorio ni habla en su nombre.</li>
          <li>No envía correos por apoyos ni sin tu confirmación.</li>
        </ul>
        <p><Link href="/crear">Hacer una propuesta</Link> · <Link href="/responsables">Ver responsables por área</Link></p>
      </article>
    </div>
  );
}
