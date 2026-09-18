"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  ContactFormState,
  DeleteContactState,
} from "@/app/contacts/contact-types";
import { validateContactForm } from "@/app/contacts/contact-validation";
import { db } from "@/db";
import { companies, contacts, opportunities } from "@/db/schema";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasDatabaseCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return candidate.code === code || hasDatabaseCode(candidate.cause, code);
}

async function companyExists(companyId: string) {
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return Boolean(company);
}

export async function createContactAction(
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const validation = validateContactForm(formData);
  if (!validation.success) {
    return { errors: validation.errors, values: validation.values };
  }

  let contactId: string;
  try {
    if (!(await companyExists(validation.data.companyId))) {
      return {
        errors: { companyId: ["La empresa seleccionada ya no existe."] },
        values: validation.values,
      };
    }

    const [contact] = await db
      .insert(contacts)
      .values(validation.data)
      .returning({ id: contacts.id });
    if (!contact) {
      return {
        message: "No se pudo crear el contacto.",
        values: validation.values,
      };
    }

    contactId = contact.id;
  } catch (error) {
    if (hasDatabaseCode(error, "23503")) {
      return {
        errors: { companyId: ["La empresa seleccionada ya no existe."] },
        values: validation.values,
      };
    }
    return {
      message: "No se pudo crear el contacto. Inténtalo de nuevo.",
      values: validation.values,
    };
  }

  revalidatePath("/contacts");
  redirect(`/contacts/${contactId}?status=created`);
}

export async function updateContactAction(
  contactId: string,
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const validation = validateContactForm(formData);
  if (!validation.success) {
    return { errors: validation.errors, values: validation.values };
  }
  if (!uuidPattern.test(contactId)) {
    return { message: "Contacto no encontrado.", values: validation.values };
  }

  try {
    if (!(await companyExists(validation.data.companyId))) {
      return {
        errors: { companyId: ["La empresa seleccionada ya no existe."] },
        values: validation.values,
      };
    }

    const [contact] = await db
      .update(contacts)
      .set({ ...validation.data, updatedAt: new Date() })
      .where(eq(contacts.id, contactId))
      .returning({ id: contacts.id });
    if (!contact) {
      return { message: "Contacto no encontrado.", values: validation.values };
    }
  } catch (error) {
    if (hasDatabaseCode(error, "23503")) {
      return {
        message:
          "No se puede cambiar la empresa mientras el contacto esté asociado a oportunidades.",
        values: validation.values,
      };
    }
    return {
      message: "No se pudo guardar el contacto. Inténtalo de nuevo.",
      values: validation.values,
    };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  redirect(`/contacts/${contactId}?status=updated`);
}

export async function deleteContactAction(
  contactId: string,
  _previousState: DeleteContactState,
  _formData: FormData,
): Promise<DeleteContactState> {
  void _previousState;
  void _formData;

  if (!uuidPattern.test(contactId)) {
    return { message: "Contacto no encontrado." };
  }

  try {
    const deleted = await db.transaction(async (transaction) => {
      await transaction
        .update(opportunities)
        .set({ contactId: null, updatedAt: new Date() })
        .where(eq(opportunities.contactId, contactId));
      return transaction
        .delete(contacts)
        .where(eq(contacts.id, contactId))
        .returning({ id: contacts.id });
    });

    if (deleted.length === 0) return { message: "Contacto no encontrado." };
  } catch {
    return { message: "No se pudo eliminar el contacto. Inténtalo de nuevo." };
  }

  revalidatePath("/contacts");
  revalidatePath("/opportunities");
  redirect("/contacts?status=deleted");
}
