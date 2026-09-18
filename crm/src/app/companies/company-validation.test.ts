import { describe, expect, it } from "vitest";

import { validateCompanyForm } from "@/app/companies/company-validation";

function companyFormData(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("validateCompanyForm", () => {
  it("normalizes valid company input", () => {
    const result = validateCompanyForm(
      companyFormData({
        name: "  Eon Labs  ",
        website: " https://eon.example ",
        phone: " +30 210 000 0000 ",
        description: " Partner company ",
      }),
    );

    expect(result).toEqual({
      success: true,
      data: {
        name: "Eon Labs",
        website: "https://eon.example",
        phone: "+30 210 000 0000",
        description: "Partner company",
      },
      values: {
        name: "Eon Labs",
        website: "https://eon.example",
        phone: "+30 210 000 0000",
        description: "Partner company",
      },
    });
  });

  it("rejects a blank name and invalid website", () => {
    const result = validateCompanyForm(
      companyFormData({ name: "   ", website: "not-a-url" }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toEqual(["El nombre es obligatorio."]);
      expect(result.errors.website).toEqual(["Introduce una URL válida."]);
    }
  });

  it("enforces database field lengths", () => {
    const result = validateCompanyForm(
      companyFormData({
        name: "n".repeat(161),
        phone: "1".repeat(51),
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.phone).toBeDefined();
    }
  });
});
