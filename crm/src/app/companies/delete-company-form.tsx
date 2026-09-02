"use client";

import { useActionState } from "react";

import type { DeleteCompanyState } from "@/app/companies/company-types";

const initialState: DeleteCompanyState = {};

export function DeleteCompanyForm({
  action,
}: {
  action: (
    state: DeleteCompanyState,
    formData: FormData,
  ) => Promise<DeleteCompanyState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("¿Eliminar esta empresa?")) {
          event.preventDefault();
        }
      }}
    >
      <button
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Eliminando…" : "Eliminar empresa"}
      </button>
      {state.message ? (
        <p className="mt-3 max-w-xl text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
