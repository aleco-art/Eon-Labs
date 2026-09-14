import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Feed } from "@/components/feed";

async function stats() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const [r, p] = await Promise.all([
    db.from("responsables").select("id", { count: "exact", head: true }).not("email", "is", null),
    db.from("proposals").select("id", { count: "exact", head: true }).eq("hidden", false),
  ]);
  return { responsables: r.count ?? 0, proposals: p.count ?? 0 };
}

export const revalidate = 300;

export default async function Home() {
  const s = await stats();
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Propuestas ciudadanas para Panamá</p>
          <h1>
            Haz una propuesta <span>que te interesaría.</span>
          </h1>
          <p className="lead">
            Publícala para la comunidad y hazla llegar, desde aquí, a las entidades y responsables de cada área: alcaldías,
            ministerios, gremios y organizaciones.
          </p>
          <div className="hero-actions">
            <Link className="button accent" href="/crear">Hacer una propuesta</Link>
            <Link className="button secondary" href="/responsables">Ver responsables por área</Link>
          </div>
        </div>
        <aside className="hero-panel" aria-label="Cómo funciona">
          <p className="eyebrow">De tu idea a quien decide</p>
          <h2>A alguien le puede interesar tu idea.</h2>
          <ol className="steps">
            <li><b>1</b><div><strong>Propón</strong><p>Cuenta qué te gustaría ver hecho, dónde y por qué.</p></div></li>
            <li><b>2</b><div><strong>Suma apoyo</strong><p>La comunidad comenta, apoya y comparte tu propuesta.</p></div></li>
            <li><b>3</b><div><strong>Envíala</strong><p>Te sugerimos los responsables del área y la plataforma les envía el correo cuando confirmas.</p></div></li>
          </ol>
          {s && (
            <div className="hero-stats">
              <span><b>{s.responsables}</b>responsables con correo</span>
              <span><b>{s.proposals}</b>propuestas publicadas</span>
              <span><b>699</b>corregimientos</span>
            </div>
          )}
        </aside>
      </section>
      <Feed />
    </div>
  );
}
