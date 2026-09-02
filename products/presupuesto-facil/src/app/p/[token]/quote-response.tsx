"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { initialResponseState, type ResponseState } from "./response-state";
import styles from "./shared-quote.module.css";

type Props = {
  action: (previous: ResponseState, formData: FormData) => Promise<ResponseState>;
};

export function QuoteResponse({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, initialResponseState);
  const [decision, setDecision] = useState<"accepted" | "rejected" | null>(null);

  return (
    <form className={styles.response} action={formAction}>
      <h2>¿Aprueba este presupuesto?</h2>
      <p className={styles.responseHint}>
        Su respuesta queda registrada al instante. No necesita crear ninguna cuenta.
      </p>

      <div className={styles.decisions}>
        <label className={decision === "accepted" ? styles.decisionOn : styles.decision}>
          <input
            type="radio"
            name="decision"
            value="accepted"
            checked={decision === "accepted"}
            onChange={() => setDecision("accepted")}
          />
          <Check size={18} aria-hidden="true" /> Aceptar
        </label>

        <label className={decision === "rejected" ? styles.decisionOn : styles.decision}>
          <input
            type="radio"
            name="decision"
            value="rejected"
            checked={decision === "rejected"}
            onChange={() => setDecision("rejected")}
          />
          <X size={18} aria-hidden="true" /> Rechazar
        </label>
      </div>

      <label className={styles.commentLabel} htmlFor="comment">
        Comentario <span>(opcional)</span>
      </label>
      <textarea
        id="comment"
        name="comment"
        rows={3}
        maxLength={1000}
        placeholder="Añada cualquier aclaración para el profesional."
      />

      {state.status === "error" ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}

      <button type="submit" disabled={pending || decision === null}>
        {pending ? "Enviando…" : "Enviar respuesta"}
      </button>
    </form>
  );
}
