"use server";

import { revalidatePath } from "next/cache";
import { submitQuoteResponse } from "@/lib/quotes/repository";
import { quoteResponseSchema } from "@/lib/validation/quote";
import type { ResponseState } from "./response-state";

/**
 * The visitor is anonymous, so the token in the path is the only credential.
 * Everything else is validated in the database function, which checks expiry
 * and the current status before recording anything.
 */
export async function respondToQuote(
  token: string,
  _previous: ResponseState,
  formData: FormData,
): Promise<ResponseState> {
  const parsed = quoteResponseSchema.safeParse({
    decision: formData.get("decision"),
    comment: formData.get("comment") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa la respuesta.",
    };
  }

  try {
    await submitQuoteResponse(token, parsed.data);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "No se pudo registrar la respuesta.",
    };
  }

  revalidatePath(`/p/${token}`);
  return { status: "idle" };
}
