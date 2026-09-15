"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ReactNode } from "react";

import type {
  CompanyFormState,
  CompanyFormValues,
} from "@/app/companies/company-types";

const initialState: CompanyFormState = {};

export function CompanyForm({
  action,
  cancelHref,
  initialValues,
  submitLabel,
}: {
  action: (
    state: CompanyFormState,
    formData: FormData,
  ) => Promise<CompanyFormState>;
  cancelHref: string;
  initialValues: CompanyFormValues;
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

      <FormField
        error={state.errors?.name?.[0]}
        id="name"
        label="Nombre"
        required
      >
        <input
          aria-describedby={state.errors?.name ? "name-error" : undefined}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue={initialValues.name}
          id="name"
          maxLength={160}
          name="name"
          required
        />
      </FormField>

      <FormField
        error={state.errors?.website?.[0]}
        id="website"
        label="Sitio web"
      >
        <input
          aria-describedby={state.errors?.website ? "website-error" : undefined}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue={initialValues.website}
          id="website"
          maxLength={2048}
          name="website"
          placeholder="https://example.com"
          type="url"
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

      <FormField id="description" label="Descripción">
        <textarea
          className="mt-2 min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue={initialValues.description}
          id="description"
          name="description"
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
