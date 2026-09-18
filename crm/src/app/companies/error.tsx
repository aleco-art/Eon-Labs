"use client";

export default function CompaniesError({ reset }: { reset: () => void }) {
  return (
    <section aria-labelledby="page-title">
      <h1 className="text-3xl font-semibold" id="page-title">
        No se pudieron cargar las empresas
      </h1>
      <p className="mt-3 text-slate-600">
        Comprueba la conexión e inténtalo de nuevo.
      </p>
      <button
        className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        onClick={reset}
        type="button"
      >
        Reintentar
      </button>
    </section>
  );
}
