"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseEurosToCents } from "@/lib/quotes/money";
import { createQuote, shareQuote } from "@/lib/quotes/repository";
import { requireOwnerEmail } from "@/lib/session";
import { newQuoteSchema } from "@/lib/validation/quote";
import type { NewQuoteState } from "./new-quote-state";

type RawItem = {
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  taxRate?: unknown;
};

function toNumber(value: unknown) {
  const text = String(value ?? "").trim().replace(",", ".");
  return text === "" ? Number.NaN : Number(text);
}

export async function createQuoteAction(
  _previous: NewQuoteState,
  formData: FormData,
): Promise<NewQuoteState> {
  const email = await requireOwnerEmail();

  let rawItems: RawItem[];

  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]")) as RawItem[];
  } catch {
    return { status: "error", message: "No se pudieron leer los conceptos." };
  }

  const items = [];

  for (const [index, raw] of rawItems.entries()) {
    const unitPriceCents = parseEurosToCents(String(raw.unitPrice ?? ""));

    if (unitPriceCents === null) {
      return {
        status: "error",
        message: `Revisa el precio del concepto ${index + 1}.`,
      };
    }

    items.push({
      description: String(raw.description ?? ""),
      quantity: toNumber(raw.quantity),
      unitPriceCents,
      taxRate: toNumber(raw.taxRate),
    });
  }

  const parsed = newQuoteSchema.safeParse({
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail") ?? "",
    reference: formData.get("reference"),
    notes: formData.get("notes") ?? "",
    items,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa los datos del presupuesto.",
    };
  }

  let quoteId: string;

  try {
    quoteId = await createQuote(email, parsed.data);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "No se pudo crear el presupuesto.",
    };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/${quoteId}`);
}

/**
 * The link is shown once on the next screen. The token is never stored, so a
 * quote that has not been answered can simply be shared again.
 */
export async function shareQuoteAction(formData: FormData) {
  const email = await requireOwnerEmail();
  const quoteId = String(formData.get("quoteId") ?? "");

  const link = await shareQuote(email, quoteId);

  revalidatePath(`/dashboard/${quoteId}`);
  redirect(`/dashboard/${quoteId}?enlace=${encodeURIComponent(link)}`);
}
