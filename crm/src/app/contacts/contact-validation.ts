import type {
  ContactField,
  ContactFormValues,
} from "@/app/contacts/contact-types";

export type ContactInput = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  companyId: string;
};

type ValidationResult =
  | { success: true; data: ContactInput; values: ContactFormValues }
  | {
      success: false;
      errors: Partial<Record<ContactField, string[]>>;
      values: ContactFormValues;
    };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldValue(formData: FormData, field: ContactField) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export function validateContactForm(formData: FormData): ValidationResult {
  const values: ContactFormValues = {
    firstName: fieldValue(formData, "firstName"),
    lastName: fieldValue(formData, "lastName"),
    email: fieldValue(formData, "email"),
    phone: fieldValue(formData, "phone"),
    jobTitle: fieldValue(formData, "jobTitle"),
    companyId: fieldValue(formData, "companyId"),
  };
  const errors: Partial<Record<ContactField, string[]>> = {};

  if (!values.firstName) {
    errors.firstName = ["El nombre es obligatorio."];
  } else if (values.firstName.length > 100) {
    errors.firstName = ["El nombre no puede superar 100 caracteres."];
  }

  if (!values.lastName) {
    errors.lastName = ["El apellido es obligatorio."];
  } else if (values.lastName.length > 100) {
    errors.lastName = ["El apellido no puede superar 100 caracteres."];
  }

  if (values.email.length > 320) {
    errors.email = ["El email no puede superar 320 caracteres."];
  } else if (values.email && !emailPattern.test(values.email)) {
    errors.email = ["Introduce un email válido."];
  }

  if (values.phone.length > 50) {
    errors.phone = ["El teléfono no puede superar 50 caracteres."];
  }

  if (values.jobTitle.length > 160) {
    errors.jobTitle = ["El cargo no puede superar 160 caracteres."];
  }

  if (!values.companyId) {
    errors.companyId = ["La empresa es obligatoria."];
  } else if (!uuidPattern.test(values.companyId)) {
    errors.companyId = ["Selecciona una empresa válida."];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, values };
  }

  return {
    success: true,
    data: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || null,
      phone: values.phone || null,
      jobTitle: values.jobTitle || null,
      companyId: values.companyId,
    },
    values,
  };
}
