"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  CompanyFormState,
  DeleteCompanyState,
} from "@/app/companies/company-types";
import { validateCompanyForm } from "@/app/companies/company-validation";
import { db } from "@/db";
import { companies } from "@/db/schema";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasDatabaseCode(error: unknown, codes: string[]): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return (
    (typeof candidate.code === "string" && codes.includes(candidate.code)) ||
    hasDatabaseCode(candidate.cause, codes)
  );
}

export async function createCompanyAction(
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const validation = validateCompanyForm(formData);
  if (!validation.success) {
    return { errors: validation.errors, values: validation.values };
  }

  let companyId: string;
  try {
    const [company] = await db
      .insert(companies)
      .values(validation.data)
      .returning({ id: companies.id });
    if (!company) {
      return {
        message: "No se pudo crear la empresa.",
        values: validation.values,
      };
    }
    companyId = company.id;
  } catch {
    return {
      message: "No se pudo crear la empresa. Inténtalo de nuevo.",
      values: validation.values,
    };
  }

  revalidatePath("/companies");
  redirect(`/companies/${companyId}?status=created`);
}

export async function updateCompanyAction(
  companyId: string,
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const validation = validateCompanyForm(formData);
  if (!validation.success) {
    return { errors: validation.errors, values: validation.values };
  }
  if (!uuidPattern.test(companyId)) {
    return { message: "Empresa no encontrada.", values: validation.values };
  }

  try {
    const [company] = await db
      .update(companies)
      .set({ ...validation.data, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning({ id: companies.id });
    if (!company) {
      return { message: "Empresa no encontrada.", values: validation.values };
    }
  } catch {
    return {
      message: "No se pudo guardar la empresa. Inténtalo de nuevo.",
      values: validation.values,
    };
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?status=updated`);
}

export async function deleteCompanyAction(
  companyId: string,
  _previousState: DeleteCompanyState,
  _formData: FormData,
): Promise<DeleteCompanyState> {
  void _previousState;
  void _formData;

  if (!uuidPattern.test(companyId)) {
    return { message: "Empresa no encontrada." };
  }

  try {
    const deleted = await db
      .delete(companies)
      .where(eq(companies.id, companyId))
      .returning({ id: companies.id });
    if (deleted.length === 0) return { message: "Empresa no encontrada." };
  } catch (error) {
    if (hasDatabaseCode(error, ["23001", "23503"])) {
      return {
        message:
          "No se puede eliminar la empresa porque tiene contactos u oportunidades asociados.",
      };
    }
    return { message: "No se pudo eliminar la empresa. Inténtalo de nuevo." };
  }

  revalidatePath("/companies");
  redirect("/companies?status=deleted");
}
