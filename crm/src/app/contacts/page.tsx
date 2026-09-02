import { asc, eq } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { companies, contacts } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ status }, contactRows] = await Promise.all([
    searchParams,
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        companyName: companies.name,
      })
      .from(contacts)
      .innerJoin(companies, eq(contacts.companyId, companies.id))
      .orderBy(asc(contacts.lastName), asc(contacts.firstName)),
  ]);

  return (
    <section aria-labelledby="page-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" id="page-title">
            Contactos
          </h1>
          <p className="mt-2 text-slate-600">
            Personas vinculadas a empresas del CRM.
          </p>
        </div>
        <Link
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          href="/contacts/new"
        >
          Nuevo contacto
        </Link>
      </div>

      {status === "deleted" ? (
        <p
          className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Contacto eliminado.
        </p>
      ) : null}

      {contactRows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Todavía no hay contactos.</p>
          <Link
            className="mt-4 inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
            href="/contacts/new"
          >
            Crear el primer contacto
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {contactRows.map((contact) => (
            <li
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              key={contact.id}
            >
              <Link
                className="text-lg font-semibold hover:underline"
                href={`/contacts/${contact.id}`}
              >
                {contact.firstName} {contact.lastName}
              </Link>
              <p className="mt-2 text-sm text-slate-600">
                {contact.companyName}
              </p>
              {contact.email ? (
                <p className="mt-1 truncate text-sm text-slate-500">
                  {contact.email}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
