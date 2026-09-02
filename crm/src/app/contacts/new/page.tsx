import { asc } from "drizzle-orm";
import Link from "next/link";

import { createContactAction } from "@/app/contacts/actions";
import { ContactForm } from "@/app/contacts/contact-form";
import { db } from "@/db";
import { companies } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  const companyOptions = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .orderBy(asc(companies.name));

  return (
    <section aria-labelledby="page-title">
      <Link
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
        href="/contacts"
      >
        ← Volver a Contactos
      </Link>
      <h1 className="mt-5 text-3xl font-semibold" id="page-title">
        Nuevo contacto
      </h1>
      <p className="mt-2 text-slate-600">
        Añade el contacto y selecciona su empresa.
      </p>

      {companyOptions.length === 0 ? (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p>Necesitas crear una empresa antes de añadir contactos.</p>
          <Link
            className="mt-3 inline-flex font-medium underline underline-offset-4"
            href="/companies/new"
          >
            Crear empresa
          </Link>
        </div>
      ) : (
        <ContactForm
          action={createContactAction}
          cancelHref="/contacts"
          companies={companyOptions}
          initialValues={{
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            jobTitle: "",
            companyId: "",
          }}
          submitLabel="Crear contacto"
        />
      )}
    </section>
  );
}
