import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section aria-labelledby="page-title">
      <h1 className="text-3xl font-semibold" id="page-title">
        Página no encontrada
      </h1>
      <p className="mt-3 text-slate-600">
        La ruta solicitada no existe en el CRM.
      </p>
      <Link
        className="mt-6 inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100"
        href="/companies"
      >
        Volver a Empresas
      </Link>
    </section>
  );
}
