import Link from "next/link";
export default function Sources() {
  return (
    <div className="document">
      <p className="eyebrow">INFORMACIÓN CON PROCEDENCIA</p>
      <h1>Panamá, desde sus fuentes.</h1>
      <p>
        Consulta realizada el 14 de septiembre de 2026. Conservamos los nombres
        y códigos de la fuente; explicamos las limitaciones para que puedas
        interpretar los datos.
      </p>
      <div className="stats">
        <div>
          <b>699</b>
          <small>Códigos territoriales</small>
        </div>
        <div>
          <b>83</b>
          <small>Distritos cartográficos</small>
        </div>
        <div>
          <b>13</b>
          <small>Provincias y comarcas</small>
        </div>
      </div>
      <h2>División territorial</h2>
      <p>
        La base procede de la capa{" "}
        <a
          href="https://services6.arcgis.com/LC15PAkubfypkSFO/arcgis/rest/services/corregimientos_panama/FeatureServer/0"
          target="_blank"
          rel="noreferrer"
        >
          Corregimientos del Instituto Geográfico Nacional Tommy Guardia
        </a>
        , atribuida en sus metadatos a esa institución. El servicio declara
        datos actualizados a 2024, publicados como conjunto de 2025. Descargamos
        atributos por su API pública, sin geometría, y consolidamos 730
        registros cartográficos en 699 códigos únicos. Las repeticiones
        representaban partes de un mismo territorio.
      </p>
      <p>
        Los selectores conservan las relaciones de esa cartografía, que no
        equivalen siempre a categorías jurídicas. Guna Yala aparece con un
        distrito instrumental para completar la jerarquía. La comarca Naso Tjër
        Di aparece agrupada en Bocas del Toro y como un área territorial; la
        propia fuente advierte que sus tres corregimientos no están incorporados
        por inconsistencias de límites. No presentamos esa agrupación como su
        estatus legal.
      </p>
      <p>
        La cobertura es completa respecto del conjunto descargado, pero no está
        certificada como la división legal vigente de 2026. No hemos inventado
        subdivisiones ausentes. Los cambios posteriores requieren cotejo con la{" "}
        <a href="https://www.gacetaoficial.gob.pa/">Gaceta Oficial</a> y el{" "}
        <a href="https://www.inec.gob.pa/">INEC</a> antes de incorporarlos.
      </p>
      <h2>Contactos y competencias</h2>
      <p>
        El <Link href="/directorio">directorio inicial</Link> contiene canales
        encontrados en los sitios de las organizaciones. Cada ficha enlaza su
        fuente y fecha de consulta. Un correo publicado no demuestra que el
        buzón esté activo; una entidad sugerida no está comprometida con tu
        propuesta.
      </p>
      <p>
        La cobertura inicial se concentra en entidades nacionales y el distrito
        de Panamá. Faltan contactos locales de otras regiones, productores,
        restaurantes y organizaciones culturales. La búsqueda por propuesta
        permite ampliar esa cobertura; no ofrecemos un directorio nacional
        exhaustivo.
      </p>
      <h2>Cómo investigamos</h2>
      <p>
        Consultamos primero el directorio y la caché. Después, si está
        habilitado el proveedor de búsqueda, hacemos consultas enfocadas por
        temática y jurisdicción. Extraemos páginas públicas permitidas,
        respetamos robots.txt y límites de acceso, y mostramos solo contactos
        respaldados por enlaces. Las coincidencias web pendientes de revisión se
        identifican como tales.
      </p>
      <p>
        La búsqueda estándar usa hasta 3 consultas y 6 páginas; la ampliada,
        hasta 6 consultas y 12 páginas. Cada ejecución está limitada por tiempo
        y no consume tokens de un modelo generativo: la clasificación inicial
        usa reglas transparentes. Puede consumir créditos del proveedor de
        búsqueda. Los trabajos guardan avances y se pueden cancelar.
      </p>
      <h2>Actualización y correcciones</h2>
      <p>
        La política propuesta es revisar contactos cada 30 días y la base
        territorial cada 180 días, además de cambios oficiales conocidos. No hay
        rastreos periódicos activados por defecto. Las fechas indican una
        consulta real, no una garantía de vigencia. Para señalar un error,
        utiliza <Link href="/contacto">Contacto</Link>.
      </p>
    </div>
  );
}
