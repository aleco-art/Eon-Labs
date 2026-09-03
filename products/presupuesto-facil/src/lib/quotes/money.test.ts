import { describe, expect, it } from "vitest";
import {
  calculateQuoteTotals,
  formatCents,
  lineTaxCents,
  lineTotalCents,
  parseEurosToCents,
  type QuoteItemInput,
} from "./money";

function item(overrides: Partial<QuoteItemInput> = {}): QuoteItemInput {
  return {
    description: "Mano de obra",
    quantity: 1,
    unitPriceCents: 10000,
    taxRate: 21,
    ...overrides,
  };
}

describe("line amounts", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineTotalCents(item({ quantity: 3, unitPriceCents: 2500 }))).toBe(7500);
  });

  it("keeps fractional quantities exact", () => {
    expect(lineTotalCents(item({ quantity: 2.5, unitPriceCents: 1999 }))).toBe(4998);
  });

  it("survives quantities that float badly", () => {
    expect(lineTotalCents(item({ quantity: 0.1, unitPriceCents: 3 }))).toBe(0);
    expect(lineTotalCents(item({ quantity: 0.3, unitPriceCents: 10 }))).toBe(3);
  });

  it("rounds half away from zero", () => {
    expect(lineTotalCents(item({ quantity: 1.005, unitPriceCents: 100 }))).toBe(101);
  });

  it("rejects a quantity of zero", () => {
    expect(() => lineTotalCents(item({ quantity: 0 }))).toThrow("mayor que cero");
  });

  it("rejects a negative unit price", () => {
    expect(() => lineTotalCents(item({ unitPriceCents: -1 }))).toThrow("no puede ser negativo");
  });
});

describe("line tax", () => {
  it("applies the standard Spanish rate", () => {
    expect(lineTaxCents(item({ quantity: 1, unitPriceCents: 10000, taxRate: 21 }))).toBe(2100);
  });

  it("applies a reduced rate with decimals", () => {
    expect(lineTaxCents(item({ quantity: 1, unitPriceCents: 10000, taxRate: 10.5 }))).toBe(1050);
  });

  it("returns nothing for an exempt line", () => {
    expect(lineTaxCents(item({ taxRate: 0 }))).toBe(0);
  });

  it("rejects a rate above one hundred", () => {
    expect(() => lineTaxCents(item({ taxRate: 101 }))).toThrow("entre 0 y 100");
  });
});

describe("quote totals", () => {
  it("rounds each line before summing", () => {
    // Three lines of 0.005 EUR round to 1 cent each. Summing first would give
    // 2 cents and disagree with the lines printed on the quote.
    const totals = calculateQuoteTotals([
      item({ quantity: 1, unitPriceCents: 1, taxRate: 50 }),
      item({ quantity: 1, unitPriceCents: 1, taxRate: 50 }),
      item({ quantity: 1, unitPriceCents: 1, taxRate: 50 }),
    ]);

    expect(totals.subtotalCents).toBe(3);
    expect(totals.taxCents).toBe(3);
    expect(totals.totalCents).toBe(6);
  });

  it("adds mixed rates correctly", () => {
    const totals = calculateQuoteTotals([
      item({ quantity: 2, unitPriceCents: 5000, taxRate: 21 }),
      item({ quantity: 1, unitPriceCents: 3000, taxRate: 10 }),
    ]);

    expect(totals.subtotalCents).toBe(13000);
    expect(totals.taxCents).toBe(2400);
    expect(totals.totalCents).toBe(15400);
  });

  it("keeps the total equal to subtotal plus tax", () => {
    const totals = calculateQuoteTotals([
      item({ quantity: 1.333, unitPriceCents: 777, taxRate: 21 }),
      item({ quantity: 7.5, unitPriceCents: 1234, taxRate: 4 }),
    ]);

    expect(totals.totalCents).toBe(totals.subtotalCents + totals.taxCents);
  });

  it("returns zeros for an empty quote", () => {
    expect(calculateQuoteTotals([])).toEqual({
      lines: [],
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });

  it("exposes the amounts of every line", () => {
    const totals = calculateQuoteTotals([item({ quantity: 2, unitPriceCents: 1000, taxRate: 21 })]);

    expect(totals.lines[0].lineTotalCents).toBe(2000);
    expect(totals.lines[0].lineTaxCents).toBe(420);
  });
});

describe("formatting", () => {
  it("formats cents as euros in Spanish", () => {
    // Spanish leaves four-digit amounts ungrouped and puts a non-breaking space
    // before the symbol. Grouping only starts at five digits.
    expect(formatCents(123456).replace(/ /g, " ")).toBe("1234,56 €");
  });

  it("reads a comma as the decimal separator", () => {
    expect(parseEurosToCents("12,50")).toBe(1250);
  });

  it("reads a dot as thousands when a comma is present", () => {
    expect(parseEurosToCents("1.234,56")).toBe(123456);
  });

  it("reads a plain dot as decimals", () => {
    expect(parseEurosToCents("12.50")).toBe(1250);
  });

  it("reads a whole number", () => {
    expect(parseEurosToCents("680")).toBe(68000);
  });

  it("ignores spaces and the euro sign", () => {
    expect(parseEurosToCents(" 145,00 € ")).toBe(14500);
  });

  it("rejects text that is not a number", () => {
    expect(parseEurosToCents("mil euros")).toBeNull();
    expect(parseEurosToCents("")).toBeNull();
  });

  it("formats zero", () => {
    expect(formatCents(0).replace(/ /g, " ")).toBe("0,00 €");
  });
});
