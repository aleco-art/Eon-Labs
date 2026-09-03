import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/env";
import { calculateQuoteTotals } from "@/lib/quotes/money";
import { buildQuoteLink, createQuoteToken, defaultTokenExpiry } from "@/lib/quotes/token";
import type { NewQuoteInput, QuoteResponseInput } from "@/lib/validation/quote";

/**
 * Every call goes through a security definer function scoped to the owner
 * email. The tables themselves stay closed to anon, so the browser can never
 * read a row directly, and no privileged key is involved.
 */

export type QuoteStatus =
  | "draft"
  | "shared"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired";

export type QuoteSummary = {
  id: string;
  reference: string;
  status: QuoteStatus;
  totalCents: number;
  clientName: string;
  updatedAt: string;
  respondedAt: string | null;
  responseComment: string | null;
  isShared: boolean;
};

export type QuoteItem = {
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxRate: number;
  lineTotalCents: number;
};

export type QuoteDetail = {
  id: string;
  reference: string;
  status: QuoteStatus;
  clientName: string;
  notes: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  isShared: boolean;
  expiresAt: string | null;
  sharedAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  responseComment: string | null;
  items: QuoteItem[];
  events: { type: string; occurredAt: string }[];
};

export type SharedQuote = {
  reference: string;
  status: QuoteStatus;
  businessName: string | null;
  clientName: string;
  notes: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  expiresAt: string;
  respondedAt: string | null;
  responseComment: string | null;
  items: QuoteItem[];
};

function fail(message: string, error: { message: string } | null): never {
  throw new Error(error ? `${message} ${error.message}` : message);
}

export async function listQuotes(ownerEmail: string): Promise<QuoteSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("demo_list_quotes", {
    p_owner_email: ownerEmail,
  });

  if (error) {
    fail("No se pudieron cargar los presupuestos.", error);
  }

  return (data as QuoteSummary[] | null) ?? [];
}

export async function getQuote(
  ownerEmail: string,
  quoteId: string,
): Promise<QuoteDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("demo_get_quote", {
    p_owner_email: ownerEmail,
    p_quote_id: quoteId,
  });

  if (error) {
    fail("No se pudo cargar el presupuesto.", error);
  }

  return (data as QuoteDetail | null) ?? null;
}

export async function createQuote(
  ownerEmail: string,
  input: NewQuoteInput,
): Promise<string> {
  const supabase = await createClient();
  const totals = calculateQuoteTotals(input.items);

  const { data, error } = await supabase.rpc("demo_create_quote", {
    p_owner_email: ownerEmail,
    p_client_name: input.clientName,
    p_client_email: input.clientEmail,
    p_reference: input.reference,
    p_notes: input.notes,
    p_subtotal_cents: totals.subtotalCents,
    p_tax_cents: totals.taxCents,
    p_items: totals.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      taxRate: line.taxRate,
      lineTotalCents: line.lineTotalCents,
    })),
  });

  if (error) {
    fail("No se pudo crear el presupuesto.", error);
  }

  return data as string;
}

/**
 * The link is returned once and the token is never stored, only its hash. A
 * quote that has not been answered can be shared again for a fresh link.
 */
export async function shareQuote(ownerEmail: string, quoteId: string): Promise<string> {
  const supabase = await createClient();
  const token = createQuoteToken();

  const { error } = await supabase.rpc("demo_share_quote", {
    p_owner_email: ownerEmail,
    p_quote_id: quoteId,
    p_token: token,
    p_expires_at: defaultTokenExpiry().toISOString(),
  });

  if (error) {
    fail("No se pudo compartir el presupuesto.", error);
  }

  return buildQuoteLink(getAppUrl(), token);
}

export async function fetchSharedQuote(token: string): Promise<SharedQuote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_quote", { p_token: token });

  if (error) {
    fail("No se pudo abrir el presupuesto.", error);
  }

  return (data as SharedQuote | null) ?? null;
}

export async function submitQuoteResponse(token: string, input: QuoteResponseInput) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_quote", {
    p_token: token,
    p_decision: input.decision,
    p_comment: input.comment,
  });

  if (error) {
    fail("No se pudo registrar la respuesta.", error);
  }
}
