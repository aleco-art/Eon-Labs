import type { Metadata } from "next";
import Link from "next/link";
import coverage from "@/data/directory-coverage.json";

export const metadata: Metadata = { title: "Fuentes y actualización" };

const sources = [
  {
    data: "División territorial (provincias, comarcas, distritos y corregimientos, con códigos)",
    entity: "Instituto Geográfico Nacional «Tommy Guardia» (capa publicada por la cuenta gubernamental de Esri Panamá)",
    url: "https://services6.arcgis.com/LC15PAkubfypkSFO/arcgis/rest/services/corregimientos_panama/FeatureServer/0",
    published: "Conjunto 2025 (leyes vigentes a 2024); última edición de datos 28-oct-2025",
    method: "API pública ArcGIS (atributos, sin geometría); 730 registros consolidados en 699 códigos",
  },
  {
    data: "Contraste de nombres y estructura territorial",
    entity: "INEC · Contraloría General de la República",
    url: "https://www.inec.gob.pa/archivos/P053342420231213140620Cuadro%2004.pdf",
    published: "Censo 2023, Cuadro 4 (dic. 2023)",
    method: "Extracción de texto del PDF y cruce nombre a nombre",
  },
  {
    data: "Canales de municipios (teléfono y correo del despacho)",
    entity: "AMUPA · Asociación de Municipios de Panamá",
    url: "https://amupa.org.pa/wp-content/uploads/2024/10/Directorio-de-Alcaldes-de-Panama-2024-2029.pdf",
    published: "Octubre de 2024",
    method: "Extracción de tablas del PDF, validación de formato y revisión manual de exclusiones",
  },
  {
    data: "Oficinas regionales de turismo por provincia",
    entity: "Autoridad de Turismo de Panamá",
    url: "https://www.atp.gob.pa/oficinas-regionales/",
    published: "Sin fecha visible",
    method: "HTML estático respetando robots.txt",
  },
  {
    data: "Canales de entidades nacionales y organizaciones",
    entity: "Sitios oficiales de cada entidad (311, Asamblea Nacional, MIVIOT, MICI, MiCultura, SENACYT, MEDUCA, Defensoría, AND y otros)",
    url: "/responsables",
    published: "Según cada sitio; la guía de la Asamblea se actualizó el 16-abr-2026",
    method: "Rastreo limitado (robots.txt, 1 solicitud a la vez por dominio, tiempo límite, reintentos acotados) y verificación en la página",
  },
];

export default function Sources() {
  return (
    <div className="page narrow" style={{ maxWidth: 900 }}>
      <article className="card document">
        <p className="eyebrow">Fuentes y actualización</p>
        <h1>De dónde salen los datos</h1>
        <p>Consulta realizada el 14 de septiembre de 2026. Conservamos nombres y códigos oficiales, indicamos la procedencia de cada contacto y explicamos los límites para que puedas interpretar la información.</p>
        <div className="stats">
          <div><b>699</b><small>corregimientos con código</small></div>
          <div><b>83</b><small>agrupaciones de distrito</small></div>
          <div><b>{coverage.total}</b><small>responsables en el directorio</small></div>
          <div><b>{coverage.with_email}</b><small>con correo publicado</small></div>
        </div>

        <h2>Registro de fuentes</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Datos</th><th>Entidad</th><th>Publicación</th><th>Método</th></tr></thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.data}>
                  <td>{s.data}</td>
                  <td>{s.url.startsWith("/") ? <Link href={s.url}>{s.entity}</Link> : <a href={s.url} target="_blank" rel="noreferrer">{s.entity}</a>}</td>
                  <td>{s.published}</td>
                  <td>{s.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>División territorial</h2>
        <p>La base es la capa de corregimientos del IGN «Tommy Guardia», que integra información del INEC, la Comisión Nacional de Límites Político-Administrativos, la Asamblea Nacional y el Tribunal Electoral, e incluye la ley y la Gaceta de creación de cada corregimiento. Los selectores se cargan desde la base de datos, no se investigan en cada visita.</p>
        <p>La cruzamos nombre a nombre con el Censo 2023 del INEC. Coinciden 683 de 699 corregimientos; las 16 diferencias son variantes de escritura (por ejemplo, «Cerro Plata» y «Cerro de Plata», o nombres ngäbe entre paréntesis). Usamos el nombre del IGN como oficial y guardamos la variante del INEC como alias de búsqueda ({coverage.territory_aliases} territorios con alias).</p>
        <h3>Discrepancias y límites conocidos</h3>
        <ul>
          <li><b>Comarca Naso Tjër Di</b> (Ley 188 de 2020): el IGN la representa como un distrito de Bocas del Toro con un área única, porque sus tres corregimientos aún no están cargados por inconsistencias de límites. El Censo 2023 mantiene el corregimiento El Teribe en Changuinola. Pendiente de resolver con la Gaceta Oficial.</li>
          <li><b>Guna Yala</b> aparece con un distrito instrumental creado para la representación cartográfica; no es una categoría jurídica.</li>
          <li>La cobertura es completa respecto de la capa descargada, pero no es una certificación legal de la división vigente en 2026. Los cambios posteriores se cotejarán con la <a href="https://www.gacetaoficial.gob.pa/" target="_blank" rel="noreferrer">Gaceta Oficial</a> antes de incorporarlos.</li>
        </ul>

        <h2>Directorio de responsables por área</h2>
        <p>Cada responsable tiene áreas temáticas, jurisdicción (nacional, provincial o municipal), canal de contacto, fuente y fecha de consulta. Al enviar una propuesta, se sugieren según competencia y territorio, no solo por palabras: un municipio solo aparece para propuestas de su distrito.</p>
        <ul>
          <li><b>{coverage.national_entities}</b> entidades nacionales y organizaciones, y <b>{coverage.regional_offices}</b> oficinas regionales de la ATP, todas con fuente oficial.</li>
          <li><b>{coverage.municipalities}</b> municipios desde el directorio de AMUPA: {coverage.districts_with_municipal_email} de {coverage.districts_total} agrupaciones de distrito tienen correo. Se marcan como «otra fuente pública» porque AMUPA no es un sitio del Estado, y muchos usan dominios genéricos (gmail, hotmail). Deben corroborarse en fuentes municipales oficiales.</li>
          <li>Se excluyeron {coverage.amupa_excluded.length} correos municipales: con formato inválido, repetidos para otro distrito, de departamentos no relacionados o con apariencia de cuenta personal.</li>
        </ul>
        <h3>Vacíos del directorio</h3>
        <ul>
          <li>Sin correo municipal: {coverage.districts_without_municipal_email.join("; ")}.</li>
          {coverage.atp_not_imported.map((a) => <li key={a.province_code}>ATP, provincia {a.province_code}: {a.reason}</li>)}
          {coverage.rejected.map((r) => <li key={r.entity}>{r.entity}: {r.reason}</li>)}
          <li>No hay aún juntas comunales (corregimientos), restaurantes, operadores turísticos ni estudios de arquitectura individuales. Pueden añadirse manualmente desde cada propuesta.</li>
        </ul>
        <p>Validar el formato o el dominio de un correo no demuestra que el buzón exista ni que alguien vaya a responder.</p>

        <h2>Cómo se investigó</h2>
        <p>Primero buscamos catálogos abiertos (el portal de datos abiertos no tiene un directorio de entidades vigente), después páginas específicas por entidad y, por último, extracción de HTML y de PDF. No se usó navegador automatizado ni OCR. El rastreo inicial revisó 35 sitios: se respetó robots.txt, un sitio que devolvió 403 no se volvió a consultar y los que no respondieron se descartaron. Cada sitio tomó entre 1,8 y 65 segundos. No se usaron modelos de lenguaje: la extracción y la validación se hicieron con código, y la selección final se revisó manualmente.</p>
        <p>La búsqueda web por propuesta es opcional (requiere un proveedor de búsqueda configurado). Solo extrae automáticamente páginas de dominios <code>.gob.pa</code> y muestra los demás resultados como candidatos sin verificar. Presupuesto: estándar hasta 3 consultas y 6 páginas; ampliada hasta 6 consultas y 12 páginas; máximo 240 segundos; caché compartida de 7 días sin datos de las cuentas.</p>

        <h2>Política de actualización</h2>
        <ul>
          <li><b>Contactos:</b> revisión cada 90 días, o antes si se reporta un error. Los datos reportados pasan a «revisar».</li>
          <li><b>División territorial:</b> revisión cada 12 meses o cuando la Gaceta Oficial publique cambios.</li>
          <li>No hay rastreos automáticos programados. La actualización se ejecuta con los scripts documentados en el repositorio.</li>
        </ul>
        <p>¿Encontraste un error? Usa «Reportar dato incorrecto» en <Link href="/responsables">Responsables por área</Link>.</p>
      </article>
    </div>
  );
}
