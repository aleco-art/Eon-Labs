/**
 * Monetary arithmetic for quotes.
 *
 * Amounts are integer cents and never floating point euros. Quantities carry
 * three decimals and tax rates two, matching the numeric precision declared in
 * the migrations, so both sides of the wire agree on every value.
 *
 * Each line is rounded to the cent before it is summed. Rounding the sum
 * instead would let a quote disagree with the lines printed next to it.
 */

const QUANTITY_SCALE = 1000;
const TAX_RATE_SCALE = 100;
const PERCENT = 100;
const CENTS_PER_EURO = 100;

export type QuoteItemInput = {
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxRate: number;
};

export type QuoteLine = QuoteItemInput & {
  lineTotalCents: number;
  lineTaxCents: number;
};

export type QuoteTotals = {
  lines: QuoteLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

function assertSafe(value: number, label: string) {
  if (!Number.isFinite(value) || !Number.isSafeInteger(Math.round(value))) {
    throw new Error(`El importe calculado excede el rango seguro (${label}).`);
  }
}

/** Rounds half away from zero, so 0.5 cents never disappears into the bank. */
function roundHalfUp(value: number) {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function toScaledInteger(value: number, scale: number, label: string) {
  const scaled = roundHalfUp(value * scale);
  assertSafe(scaled, label);
  return scaled;
}

export function lineTotalCents(item: QuoteItemInput) {
  if (item.quantity <= 0) {
    throw new Error("La cantidad debe ser mayor que cero.");
  }

  if (item.unitPriceCents < 0) {
    throw new Error("El precio unitario no puede ser negativo.");
  }

  const quantityThousandths = toScaledInteger(item.quantity, QUANTITY_SCALE, "cantidad");
  const product = quantityThousandths * item.unitPriceCents;
  assertSafe(product, "importe de línea");

  return roundHalfUp(product / QUANTITY_SCALE);
}

export function lineTaxCents(item: QuoteItemInput) {
  if (item.taxRate < 0 || item.taxRate > PERCENT) {
    throw new Error("El tipo impositivo debe estar entre 0 y 100.");
  }

  const rateHundredths = toScaledInteger(item.taxRate, TAX_RATE_SCALE, "tipo impositivo");
  const product = lineTotalCents(item) * rateHundredths;
  assertSafe(product, "impuesto de línea");

  return roundHalfUp(product / (TAX_RATE_SCALE * PERCENT));
}

export function calculateQuoteTotals(items: QuoteItemInput[]): QuoteTotals {
  const lines = items.map((item) => ({
    ...item,
    lineTotalCents: lineTotalCents(item),
    lineTaxCents: lineTaxCents(item),
  }));

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const taxCents = lines.reduce((sum, line) => sum + line.lineTaxCents, 0);

  assertSafe(subtotalCents, "subtotal");
  assertSafe(taxCents, "impuestos");

  return {
    lines,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function formatCents(cents: number) {
  return euroFormatter.format(cents / CENTS_PER_EURO);
}
