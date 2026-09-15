import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { validateContactForm } from "@/app/contacts/contact-validation";

function contactFormData(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("validateContactForm", () => {
  it("normalizes a valid contact with a company", () => {
    const companyId = randomUUID();
    const result = validateContactForm(
      contactFormData({
        firstName: "  Ada ",
        lastName: " Lovelace ",
        email: " ada@example.com ",
        phone: " +30 210 123 4567 ",
        jobTitle: " Founder ",
        companyId,
      }),
    );

    expect(result).toEqual({
      success: true,
      data: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+30 210 123 4567",
        jobTitle: "Founder",
        companyId,
      },
      values: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+30 210 123 4567",
        jobTitle: "Founder",
        companyId,
      },
    });
  });

  it("requires names and a company", () => {
    const result = validateContactForm(contactFormData({}));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.firstName).toBeDefined();
      expect(result.errors.lastName).toBeDefined();
      expect(result.errors.companyId).toEqual(["La empresa es obligatoria."]);
    }
  });

  it("rejects invalid company and email values", () => {
    const result = validateContactForm(
      contactFormData({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "invalid",
        companyId: "not-a-company",
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toEqual(["Introduce un email válido."]);
      expect(result.errors.companyId).toEqual([
        "Selecciona una empresa válida.",
      ]);
    }
  });
});
