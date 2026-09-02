import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { deleteCompanyAction } from "@/app/companies/actions";
import { DeleteCompanyForm } from "@/app/companies/delete-company-form";
import { db } from "@/db";
import { companies } from "@/db/schema";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ id }, { status }] = await Promise.all([params, searchParams]);

  if (!uuidPattern.test(id)) notFound();

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);

  if (!company) notFound();

  return (
    <section aria-labelledby="page-title">
      <Link
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
        href="/companies"
      >
        ← Volver a Empresas
      </Link>

      {status === "created" || status === "updated" ? (
        <p
          className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Empresa {status === "created" ? "creada" : "actualizada"}.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" id="page-title">
            {company.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Creada el {formatDate(company.createdAt)}
          </p>
        </div>
        <Link
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          href={`/companies/${company.id}/edit`}
        >
          Editar
        </Link>
      </div>

      <dl className="mt-8 grid max-w-2xl gap-6 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <CompanyDetail label="Sitio web">
          {company.website ? (
            <a
              className="underline underline-offset-4"
              href={company.website}
              rel="noreferrer"
              target="_blank"
            >
              {company.website}
            </a>
          ) : (
            "—"
          )}
        </CompanyDetail>
        <CompanyDetail label="Teléfono">{company.phone || "—"}</CompanyDetail>
        <CompanyDetail label="Descripción" wide>
          {company.description || "—"}
        </CompanyDetail>
      </dl>

      <div className="mt-10 border-t border-slate-200 pt-6">
        <DeleteCompanyForm
          action={deleteCompanyAction.bind(null, company.id)}
        />
      </div>
    </section>
  );
}

function CompanyDetail({
  children,
  label,
  wide = false,
}: {
  children: ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-slate-900">{children}</dd>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(value);
}
