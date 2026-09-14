import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Contacto" };

export default function Contact() {
  return (
    <div className="page narrow">
      <article className="card document">
        <p className="eyebrow">Contacto</p>
        <h1>¿Cómo podemos ayudarte?</h1>
        <p>El canal de atención general de la plataforma está pendiente de configuración: todavía no hay una dirección publicada, y no mostramos un formulario que aparente enviar algo.</p>
        <h2>Mientras tanto</h2>
        <ul>
          <li><b>Contenido inapropiado o spam:</b> usa «Reportar» en la propuesta, el comentario o el archivo.</li>
          <li><b>Un contacto del directorio es incorrecto:</b> usa «Reportar dato incorrecto» en <Link href="/responsables">Responsables por área</Link>.</li>
          <li><b>Errores en la división territorial:</b> consulta la procedencia en <Link href="/fuentes">Fuentes y actualización</Link> y repórtalo desde cualquier propuesta.</li>
        </ul>
      </article>
    </div>
  );
}
