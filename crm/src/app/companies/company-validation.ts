import type {
  CompanyField,
  CompanyFormValues,
} from "@/app/companies/company-types";

export type CompanyInput = {
  name: string;
  website: string | null;
  phone: string | null;
  description: string | null;
};

type ValidationResult =
  | { success: true; data: CompanyInput; values: CompanyFormValues }
  | {
      success: false;
      errors: Partial<Record<CompanyField, string[]>>;
      values: CompanyFormValues;
    };

function fieldValue(formData: FormData, field: CompanyField) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export function validateCompanyForm(formData: FormData): ValidationResult {
  const values: CompanyFormValues = {
    name: fieldValue(formData, "name"),
    website: fieldValue(formData, "website"),
    phone: fieldValue(formData, "phone"),
    description: fieldValue(formData, "description"),
  };
  const errors: Partial<Record<CompanyField, string[]>> = {};

  if (!values.name) {
    errors.name = ["El nombre es obligatorio."];
  } else if (values.name.length > 160) {
    errors.name = ["El nombre no puede superar 160 caracteres."];
  }

  if (values.website.length > 2048) {
    errors.website = ["El sitio web no puede superar 2048 caracteres."];
  } else if (values.website) {
    try {
      const website = new URL(values.website);
      if (!["http:", "https:"].includes(website.protocol)) {
        errors.website = ["Introduce una URL http o https válida."];
      }
    } catch {
      errors.website = ["Introduce una URL válida."];
    }
  }

  if (values.phone.length > 50) {
    errors.phone = ["El teléfono no puede superar 50 caracteres."];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, values };
  }

  return {
    success: true,
    data: {
      name: values.name,
      website: values.website || null,
      phone: values.phone || null,
      description: values.description || null,
    },
    values,
  };
}
