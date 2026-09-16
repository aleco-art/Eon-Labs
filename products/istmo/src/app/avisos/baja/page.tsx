import type { Metadata } from "next";
import Link from "next/link";
import { Unsubscribe } from "@/components/unsubscribe";

export const metadata: Metadata = { title: "Dejar de recibir avisos", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="page narrow">
      <article className="card document">
        <p className="eyebrow">Avisos por correo</p>
        <h1>Dejar de recibir el resumen</h1>
        {t ? (
          <>
            <p>
              Si confirmas, dejaremos de enviarte el resumen diario de lo que pasa en tus propuestas. Seguirás viendo
              todo dentro de la plataforma, en la campanita, y los correos de tu cuenta (como restablecer la contraseña)
              seguirán llegando.
            </p>
            <Unsubscribe token={t} />
          </>
        ) : (
          <p>
            Este enlace está incompleto. Ábrelo desde el correo del resumen, o cambia la preferencia desde{" "}
            <Link href="/cuenta">tu cuenta</Link>.
          </p>
        )}
      </article>
    </div>
  );
}
