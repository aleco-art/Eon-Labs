"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ReactNode } from "react";

import type {
  CompanyOption,
  ContactFormState,
  ContactFormValues,
} from "@/app/contacts/contact-types";

const initialState: ContactFormState = {};

export function ContactForm({
  action,
  cancelHref,
  companies,
  initialValues,
  submitLabel,
}: {
  action: (
    state: ContactFormState,
    formData: FormData,
  ) => Promise<ContactFormState>;
  cancelHref: string;
  companies: CompanyOption[];
  initialValues: ContactFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-8 max-w-2xl space-y-6">
      {state.message ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          error={state.errors?.firstName?.[0]}
          id="firstName"
          label="Nombre"
          required
        >
          <input
            aria-describedby={
              state.errors?.firstName ? "firstName-error" : undefined
            }
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            defaultValue={initialValues.firstName}
            id="firstName"
            maxLength={100}
            name="firstName"
            required
          />
        </FormField>
        <FormField
          error={state.errors?.lastName?.[0]}
          id="lastName"
          label="Apellido"
          required
        >
          <input
            aria-describedby={
              state.errors?.lastName ? "lastName-error" : undefined
            }
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            defaultValue={initialValues.lastName}
            id="lastName"
            maxLength={100}
            name="lastName"
            required
          />
        </FormField>
      </div>

      <FormField
        error={state.errors?.companyId?.[0]}
        id="companyId"
        label="Empresa"
        required
      >
        <select
          aria-describedby={
            state.errors?.companyId ? "companyId-error" : undefined
          }
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue={initialValues.companyId}
          id="companyId"
          name="companyId"
          required
        >
          <option value="">Selecciona una empresa</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField error={state.errors?.email?.[0]} id="email" label="Email">
        <input
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue={initialValues.email}
          id="email"
          maxLength={320}
          name="email"
          type="email"
        />
      </FormField>

      <FormField error={state.errors?.phone?.[0]} id="phone" label="Teléfono">
        <input
          aria-describedby={state.errors?.phone ? "phone-error" : undefined}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue={initialValues.phone}
          id="phone"
          maxLength={50}
          name="phone"
          type="tel"
        />
      </FormField>

      <FormField
        error={state.errors?.jobTitle?.[0]}
        id="jobTitle"
        label="Cargo"
      >
        <input
          aria-describedby={
            state.errors?.jobTitle ? "jobTitle-error" : undefined
          }
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue={initialValues.jobTitle}
          id="jobTitle"
          maxLength={160}
          name="jobTitle"
        />
      </FormField>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          href={cancelHref}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function FormField({
  children,
  error,
  id,
  label,
  required = false,
}: {
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-800" htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-sm text-red-700" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
