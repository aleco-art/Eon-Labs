import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { deleteContactAction } from "@/app/contacts/actions";
import { DeleteContactForm } from "@/app/contacts/delete-contact-form";
import { db } from "@/db";
import { companies, contacts } from "@/db/schema";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ id }, { status }] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(id)) notFound();

  const [contact] = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      jobTitle: contacts.jobTitle,
      createdAt: contacts.createdAt,
      companyId: companies.id,
      companyName: companies.name,
    })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.id, id))
    .limit(1);
  if (!contact) notFound();

  const fullName = `${contact.firstName} ${contact.lastName}`;
  return (
    <section aria-labelledby="page-title">
      <Link
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
        href="/contacts"
      >
        ← Volver a Contactos
      </Link>
      {status === "created" || status === "updated" ? (
        <p
          className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Contacto {status === "created" ? "creado" : "actualizado"}.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" id="page-title">
            {fullName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Creado el{" "}
            {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
              contact.createdAt,
            )}
          </p>
        </div>
        <Link
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          href={`/contacts/${contact.id}/edit`}
        >
          Editar
        </Link>
      </div>

      <dl className="mt-8 grid max-w-2xl gap-6 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <ContactDetail label="Empresa">
          <Link
            className="underline underline-offset-4"
            href={`/companies/${contact.companyId}`}
          >
            {contact.companyName}
          </Link>
        </ContactDetail>
        <ContactDetail label="Cargo">{contact.jobTitle || "—"}</ContactDetail>
        <ContactDetail label="Email">
          {contact.email ? (
            <a
              className="underline underline-offset-4"
              href={`mailto:${contact.email}`}
            >
              {contact.email}
            </a>
          ) : (
            "—"
          )}
        </ContactDetail>
        <ContactDetail label="Teléfono">{contact.phone || "—"}</ContactDetail>
      </dl>

      <div className="mt-10 border-t border-slate-200 pt-6">
        <DeleteContactForm
          action={deleteContactAction.bind(null, contact.id)}
        />
      </div>
    </section>
  );
}

function ContactDetail({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{children}</dd>
    </div>
  );
}
