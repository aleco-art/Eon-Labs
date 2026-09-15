import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateContactAction } from "@/app/contacts/actions";
import { ContactForm } from "@/app/contacts/contact-form";
import { db } from "@/db";
import { companies, contacts } from "@/db/schema";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const [[contact], companyOptions] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.id, id)).limit(1),
    db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .orderBy(asc(companies.name)),
  ]);
  if (!contact) notFound();

  return (
    <section aria-labelledby="page-title">
      <Link
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
        href={`/contacts/${contact.id}`}
      >
        ← Volver a {contact.firstName} {contact.lastName}
      </Link>
      <h1 className="mt-5 text-3xl font-semibold" id="page-title">
        Editar contacto
      </h1>
      <ContactForm
        action={updateContactAction.bind(null, contact.id)}
        cancelHref={`/contacts/${contact.id}`}
        companies={companyOptions}
        initialValues={{
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          jobTitle: contact.jobTitle ?? "",
          companyId: contact.companyId,
        }}
        submitLabel="Guardar cambios"
      />
    </section>
  );
}
