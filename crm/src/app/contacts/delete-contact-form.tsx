"use client";

import { useActionState } from "react";
import type { DeleteContactState } from "@/app/contacts/contact-types";

const initialState: DeleteContactState = {};

export function DeleteContactForm({
  action,
}: {
  action: (
    state: DeleteContactState,
    formData: FormData,
  ) => Promise<DeleteContactState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("¿Eliminar este contacto?")) event.preventDefault();
      }}
    >
      <button
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Eliminando…" : "Eliminar contacto"}
      </button>
      {state.message ? (
        <p className="mt-3 max-w-xl text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
