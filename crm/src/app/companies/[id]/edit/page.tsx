import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCompanyAction } from "@/app/companies/actions";
import { CompanyForm } from "@/app/companies/company-form";
import { db } from "@/db";
import { companies } from "@/db/schema";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
        href={`/companies/${company.id}`}
      >
        ← Volver a {company.name}
      </Link>
      <h1 className="mt-5 text-3xl font-semibold" id="page-title">
        Editar empresa
      </h1>
      <CompanyForm
        action={updateCompanyAction.bind(null, company.id)}
        cancelHref={`/companies/${company.id}`}
        initialValues={{
          name: company.name,
          website: company.website ?? "",
          phone: company.phone ?? "",
          description: company.description ?? "",
        }}
        submitLabel="Guardar cambios"
      />
    </section>
  );
}
