import { asc } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { companies } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ status }, companyRows] = await Promise.all([
    searchParams,
    db.select().from(companies).orderBy(asc(companies.name)),
  ]);

  return (
    <section aria-labelledby="page-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" id="page-title">
            Empresas
          </h1>
          <p className="mt-2 text-slate-600">
            Organizaciones registradas en el CRM.
          </p>
        </div>
        <Link
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          href="/companies/new"
        >
          Nueva empresa
        </Link>
      </div>

      {status === "deleted" ? (
        <p
          className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Empresa eliminada.
        </p>
      ) : null}

      {companyRows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Todavía no hay empresas.</p>
          <Link
            className="mt-4 inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
            href="/companies/new"
          >
            Crear la primera empresa
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {companyRows.map((company) => (
            <li
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              key={company.id}
            >
              <Link
                className="text-lg font-semibold hover:underline"
                href={`/companies/${company.id}`}
              >
                {company.name}
              </Link>
              <p className="mt-2 truncate text-sm text-slate-600">
                {company.website || "Sin sitio web"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
