import { describe, expect, it } from "vitest";
import { clientSchema, quoteItemSchema, quoteResponseSchema, quoteSchema } from "./quote";

const validClient = {
  name: "Instalaciones Ruiz",
  email: "contacto@ruiz.example",
  phone: "600123456",
  taxId: "B12345678",
  address: "Calle Mayor 1",
};

const validItem = {
  description: "Sustitución de caldera",
  quantity: 1,
  unitPriceCents: 120000,
  taxRate: 21,
};

describe("client", () => {
  it("accepts a complete client", () => {
    expect(clientSchema.parse(validClient).name).toBe("Instalaciones Ruiz");
  });

  it("requires a name", () => {
    const result = clientSchema.safeParse({ ...validClient, name: "   " });

    expect(result.success).toBe(false);
  });

  it("turns empty optional fields into null", () => {
    const parsed = clientSchema.parse({ ...validClient, phone: "", taxId: "", address: "" });

    expect(parsed.phone).toBeNull();
    expect(parsed.taxId).toBeNull();
    expect(parsed.address).toBeNull();
  });

  it("accepts a client without an email", () => {
    expect(clientSchema.parse({ ...validClient, email: "" }).email).toBeNull();
  });

  it("rejects a malformed email", () => {
    expect(clientSchema.safeParse({ ...validClient, email: "no-es-un-correo" }).success).toBe(false);
  });

  it("normalises the email", () => {
    expect(clientSchema.parse({ ...validClient, email: "  Contacto@Ruiz.Example " }).email).toBe(
      "contacto@ruiz.example",
    );
  });
});

describe("quote item", () => {
  it("accepts a valid line", () => {
    expect(quoteItemSchema.parse(validItem).quantity).toBe(1);
  });

  it("rejects a quantity of zero", () => {
    expect(quoteItemSchema.safeParse({ ...validItem, quantity: 0 }).success).toBe(false);
  });

  it("accepts three decimals of quantity", () => {
    expect(quoteItemSchema.safeParse({ ...validItem, quantity: 1.125 }).success).toBe(true);
  });

  it("rejects four decimals of quantity", () => {
    expect(quoteItemSchema.safeParse({ ...validItem, quantity: 1.1255 }).success).toBe(false);
  });

  it("rejects a fractional cent", () => {
    expect(quoteItemSchema.safeParse({ ...validItem, unitPriceCents: 10.5 }).success).toBe(false);
  });

  it("accepts two decimals of tax rate", () => {
    expect(quoteItemSchema.safeParse({ ...validItem, taxRate: 10.55 }).success).toBe(true);
  });

  it("rejects a tax rate above one hundred", () => {
    expect(quoteItemSchema.safeParse({ ...validItem, taxRate: 100.01 }).success).toBe(false);
  });
});

describe("quote", () => {
  const validQuote = {
    clientId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    reference: "2026-001",
    notes: "",
    items: [validItem],
  };

  it("accepts a valid quote", () => {
    expect(quoteSchema.parse(validQuote).reference).toBe("2026-001");
  });

  it("requires at least one line", () => {
    expect(quoteSchema.safeParse({ ...validQuote, items: [] }).success).toBe(false);
  });

  it("requires a client identifier", () => {
    expect(quoteSchema.safeParse({ ...validQuote, clientId: "cliente-1" }).success).toBe(false);
  });

  it("requires a reference", () => {
    expect(quoteSchema.safeParse({ ...validQuote, reference: "" }).success).toBe(false);
  });
});

describe("quote response", () => {
  it("accepts an acceptance", () => {
    expect(quoteResponseSchema.parse({ decision: "accepted", comment: "" }).comment).toBeNull();
  });

  it("accepts a rejection with a comment", () => {
    expect(
      quoteResponseSchema.parse({ decision: "rejected", comment: "Demasiado caro" }).comment,
    ).toBe("Demasiado caro");
  });

  it("rejects an unknown decision", () => {
    expect(quoteResponseSchema.safeParse({ decision: "quizás", comment: "" }).success).toBe(false);
  });

  it("rejects an overlong comment", () => {
    expect(
      quoteResponseSchema.safeParse({ decision: "rejected", comment: "x".repeat(1001) }).success,
    ).toBe(false);
  });
});
