import { z } from "zod";

/**
 * These schemas mirror the check constraints declared in the migrations. The
 * database stays the last line of defence; validating here lets a form answer
 * in Spanish instead of surfacing a constraint violation.
 */

const MAX_DECIMALS = {
  quantity: 3,
  taxRate: 2,
} as const;

function hasAtMostDecimals(value: number, decimals: number) {
  const text = value.toString();

  if (text.includes("e") || text.includes("E")) {
    return false;
  }

  const [, fraction = ""] = text.split(".");
  return fraction.length <= decimals;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable();

export const clientSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(160),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Introduce un correo válido.",
    })
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  phone: optionalText(40),
  taxId: optionalText(20),
  address: optionalText(400),
});

export const quoteItemSchema = z.object({
  description: z.string().trim().min(1, "Describe el concepto.").max(300),
  quantity: z
    .number()
    .positive("La cantidad debe ser mayor que cero.")
    .refine((value) => hasAtMostDecimals(value, MAX_DECIMALS.quantity), {
      message: "La cantidad admite como máximo tres decimales.",
    }),
  unitPriceCents: z
    .number()
    .int("El precio debe expresarse en céntimos enteros.")
    .nonnegative("El precio no puede ser negativo."),
  taxRate: z
    .number()
    .min(0, "El tipo impositivo no puede ser negativo.")
    .max(100, "El tipo impositivo no puede superar el 100 %.")
    .refine((value) => hasAtMostDecimals(value, MAX_DECIMALS.taxRate), {
      message: "El tipo impositivo admite como máximo dos decimales.",
    }),
});

export const quoteSchema = z.object({
  clientId: z.uuid("Selecciona un cliente."),
  reference: z.string().trim().min(1, "La referencia es obligatoria.").max(40),
  notes: optionalText(2000),
  items: z.array(quoteItemSchema).min(1, "Añade al menos un concepto."),
});

/**
 * Demo mode takes the customer by name rather than by id: the professional
 * types who the quote is for and the database reuses an existing client with
 * that name or creates one.
 */
export const newQuoteSchema = z.object({
  clientName: z.string().trim().min(1, "El cliente necesita un nombre.").max(160),
  clientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Introduce un correo válido.",
    })
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  reference: z.string().trim().min(1, "La referencia es obligatoria.").max(40),
  notes: optionalText(2000),
  items: z.array(quoteItemSchema).min(1, "Añade al menos un concepto."),
});

export const quoteResponseSchema = z.object({
  decision: z.enum(["accepted", "rejected"], {
    message: "La respuesta no es válida.",
  }),
  comment: optionalText(1000),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type NewQuoteInput = z.infer<typeof newQuoteSchema>;
export type QuoteResponseInput = z.infer<typeof quoteResponseSchema>;
