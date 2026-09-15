import Link from "next/link";

import { createCompanyAction } from "@/app/companies/actions";
import { CompanyForm } from "@/app/companies/company-form";

export default function NewCompanyPage() {
  return (
    <section aria-labelledby="page-title">
      <Link
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
        href="/companies"
      >
        ← Volver a Empresas
      </Link>
      <h1 className="mt-5 text-3xl font-semibold" id="page-title">
        Nueva empresa
      </h1>
      <p className="mt-2 text-slate-600">
        Añade la información principal de la empresa.
      </p>
      <CompanyForm
        action={createCompanyAction}
        cancelHref="/companies"
        initialValues={{ name: "", website: "", phone: "", description: "" }}
        submitLabel="Crear empresa"
      />
    </section>
  );
}
