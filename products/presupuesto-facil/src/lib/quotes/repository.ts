import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/env";
import { calculateQuoteTotals } from "@/lib/quotes/money";
import { buildQuoteLink, createQuoteToken, defaultTokenExpiry } from "@/lib/quotes/token";
import type { ClientInput, QuoteInput, QuoteResponseInput } from "@/lib/validation/quote";

/**
 * Every read here relies on row level security to scope rows to the signed in
 * user. Writes that touch quote_events go through the security definer
 * functions, which check ownership themselves.
 */

export type QuoteStatus =
  | "draft"
  | "shared"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired";

export type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type QuoteSummary = {
  id: string;
  reference: string;
  status: QuoteStatus;
  totalCents: number;
  clientName: string;
  updatedAt: string;
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
  items: {
    description: string;
    quantity: number;
    unitPriceCents: number;
    taxRate: number;
    lineTotalCents: number;
  }[];
};

function fail(message: string, error: { message: string } | null): never {
  throw new Error(error ? `${message} ${error.message}` : message);
}

export async function listClients(): Promise<ClientRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, phone")
    .order("name");

  if (error) {
    fail("No se pudieron cargar los clientes.", error);
  }

  return data ?? [];
}

export async function createClientRecord(input: ClientInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      tax_id: input.taxId,
      address: input.address,
    })
    .select("id")
    .single();

  if (error) {
    fail("No se pudo guardar el cliente.", error);
  }

  return data.id;
}

export async function listQuotes(): Promise<QuoteSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("id, reference, status, total_cents, updated_at, clients (name)")
    .order("updated_at", { ascending: false });

  if (error) {
    fail("No se pudieron cargar los presupuestos.", error);
  }

  type Row = {
    id: string;
    reference: string;
    status: QuoteStatus;
    total_cents: number;
    updated_at: string;
    clients: { name: string } | { name: string }[] | null;
  };

  return (data ?? []).map((row: Row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status,
    totalCents: row.total_cents,
    updatedAt: row.updated_at,
    clientName: Array.isArray(row.clients)
      ? (row.clients[0]?.name ?? "")
      : (row.clients?.name ?? ""),
  }));
}

export async function createQuoteRecord(input: QuoteInput): Promise<string> {
  const supabase = await createClient();
  const totals = calculateQuoteTotals(input.items);

  const { data, error } = await supabase.rpc("create_quote", {
    p_client_id: input.clientId,
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
 * The token is returned once, inside the link. It is not stored anywhere, so a
 * caller that loses it has to share the quote again.
 */
export async function shareQuote(quoteId: string): Promise<string> {
  const supabase = await createClient();
  const token = createQuoteToken();

  const { error } = await supabase.rpc("share_quote", {
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
