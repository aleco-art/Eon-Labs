import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import "./test-env";
import { pool } from "@/db";
import * as schema from "@/db/schema";
import {
  companies,
  contacts,
  notes,
  opportunities,
  opportunityStatus,
} from "@/db/schema";

let client: PoolClient;

function createTestDatabase(testClient: PoolClient) {
  return drizzle({ client: testClient, schema });
}

let db: ReturnType<typeof createTestDatabase>;

async function createCompany(name = "Eon Labs") {
  const [company] = await db.insert(companies).values({ name }).returning();

  if (!company) {
    throw new Error("Company insert did not return a row.");
  }

  return company;
}

async function createContact(companyId: string) {
  const [contact] = await db
    .insert(contacts)
    .values({ firstName: "Ada", lastName: "Lovelace", companyId })
    .returning();

  if (!contact) {
    throw new Error("Contact insert did not return a row.");
  }

  return contact;
}

describe("CRM database integrity", () => {
  beforeEach(async () => {
    client = await pool.connect();
    await client.query("BEGIN");
    db = createTestDatabase(client);
  });

  afterEach(async () => {
    if (client) {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it("inserts a company", async () => {
    const company = await createCompany();

    expect(company.name).toBe("Eon Labs");
  });

  it("lists a persisted company", async () => {
    const company = await createCompany("Company list test");
    const rows = await db
      .select()
      .from(companies)
      .where(eq(companies.id, company.id));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Company list test");
  });

  it("updates a persisted company", async () => {
    const company = await createCompany("Before update");
    const [updated] = await db
      .update(companies)
      .set({ name: "After update", website: "https://eon.example" })
      .where(eq(companies.id, company.id))
      .returning();

    expect(updated?.name).toBe("After update");
    expect(updated?.website).toBe("https://eon.example");
  });

  it("deletes an unreferenced company", async () => {
    const company = await createCompany("Delete test");
    const deleted = await db
      .delete(companies)
      .where(eq(companies.id, company.id))
      .returning({ id: companies.id });

    expect(deleted).toEqual([{ id: company.id }]);
  });

  it("inserts a contact with a valid company", async () => {
    const company = await createCompany();
    const contact = await createContact(company.id);

    expect(contact.companyId).toBe(company.id);
  });

  it("lists a persisted contact with its company", async () => {
    const company = await createCompany("Contact company");
    const contact = await createContact(company.id);
    const [row] = await db
      .select({
        id: contacts.id,
        companyName: companies.name,
      })
      .from(contacts)
      .innerJoin(companies, eq(contacts.companyId, companies.id))
      .where(eq(contacts.id, contact.id));

    expect(row).toEqual({ id: contact.id, companyName: "Contact company" });
  });

  it("updates a persisted contact", async () => {
    const company = await createCompany();
    const contact = await createContact(company.id);
    const [updated] = await db
      .update(contacts)
      .set({ firstName: "Grace", jobTitle: "Admiral" })
      .where(eq(contacts.id, contact.id))
      .returning();

    expect(updated?.firstName).toBe("Grace");
    expect(updated?.jobTitle).toBe("Admiral");
  });

  it("rejects a contact without a company", async () => {
    await expect(
      client.query(
        "INSERT INTO contacts (first_name, last_name) VALUES ($1, $2)",
        ["Missing", "Company"],
      ),
    ).rejects.toMatchObject({ code: "23502" });
  });

  it("rejects a contact without a valid company", async () => {
    await expect(
      client.query(
        "INSERT INTO contacts (first_name, last_name, company_id) VALUES ($1, $2, $3)",
        ["Grace", "Hopper", randomUUID()],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("nulls opportunity contact references and deletes the contact atomically", async () => {
    const company = await createCompany();
    const contact = await createContact(company.id);
    const [opportunity] = await db
      .insert(opportunities)
      .values({
        name: "Contact cleanup",
        companyId: company.id,
        contactId: contact.id,
        status: "NEW",
      })
      .returning();

    const deleted = await db.transaction(async (transaction) => {
      await transaction
        .update(opportunities)
        .set({ contactId: null })
        .where(eq(opportunities.contactId, contact.id));
      return transaction
        .delete(contacts)
        .where(eq(contacts.id, contact.id))
        .returning({ id: contacts.id });
    });

    const [persistedOpportunity] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, opportunity!.id));
    const deletedContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contact.id));

    expect(deleted).toEqual([{ id: contact.id }]);
    expect(persistedOpportunity?.contactId).toBeNull();
    expect(persistedOpportunity?.companyId).toBe(company.id);
    expect(deletedContacts).toHaveLength(0);
  });

  it("accepts an opportunity with a valid company", async () => {
    const company = await createCompany();
    const [opportunity] = await db
      .insert(opportunities)
      .values({ name: "Platform", companyId: company.id, status: "NEW" })
      .returning();

    expect(opportunity?.companyId).toBe(company.id);
  });

  it("rejects an opportunity contact from another company", async () => {
    const company = await createCompany("Eon Labs");
    const otherCompany = await createCompany("Other Co");
    const contact = await createContact(otherCompany.id);

    await expect(
      db.insert(opportunities).values({
        name: "Invalid relationship",
        companyId: company.id,
        contactId: contact.id,
        status: "NEW",
      }),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
  });

  it("persists every opportunity status", async () => {
    const company = await createCompany();
    const statuses = [...opportunityStatus.enumValues];
    const rows = await db
      .insert(opportunities)
      .values(
        statuses.map((status) => ({
          name: status,
          companyId: company.id,
          status,
        })),
      )
      .returning();

    expect(rows.map((row) => row.status)).toEqual(statuses);
  });

  it("rejects a negative opportunity value", async () => {
    const company = await createCompany();

    await expect(
      db.insert(opportunities).values({
        name: "Negative value",
        companyId: company.id,
        status: "NEW",
        valueAmount: "-1.00",
        currencyCode: "USD",
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  it("rejects an amount without a currency", async () => {
    const company = await createCompany();

    await expect(
      db.insert(opportunities).values({
        name: "Missing currency",
        companyId: company.id,
        status: "NEW",
        valueAmount: "1.00",
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  it("rejects a currency without an amount", async () => {
    const company = await createCompany();

    await expect(
      db.insert(opportunities).values({
        name: "Missing amount",
        companyId: company.id,
        status: "NEW",
        currencyCode: "USD",
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  it("accepts a note with exactly one target", async () => {
    const company = await createCompany();
    const [note] = await db
      .insert(notes)
      .values({ body: "Foundation complete", companyId: company.id })
      .returning();

    expect(note?.companyId).toBe(company.id);
  });

  it("rejects a note with zero targets", async () => {
    await expect(
      db.insert(notes).values({ body: "No target" }),
    ).rejects.toMatchObject({
      cause: { code: "23514" },
    });
  });

  it("rejects a note with multiple targets", async () => {
    const company = await createCompany();
    const contact = await createContact(company.id);

    await expect(
      db.insert(notes).values({
        body: "Too many targets",
        companyId: company.id,
        contactId: contact.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  it("prevents deleting a company referenced by contacts or opportunities", async () => {
    const company = await createCompany();
    await createContact(company.id);

    await client.query("SAVEPOINT company_with_contact");
    await expect(
      client.query("DELETE FROM companies WHERE id = $1", [company.id]),
    ).rejects.toMatchObject({ code: "23001" });
    await client.query("ROLLBACK TO SAVEPOINT company_with_contact");

    await client.query("DELETE FROM contacts WHERE company_id = $1", [
      company.id,
    ]);
    await db
      .insert(opportunities)
      .values({ name: "Protected", companyId: company.id, status: "NEW" });

    await client.query("SAVEPOINT company_with_opportunity");
    await expect(
      client.query("DELETE FROM companies WHERE id = $1", [company.id]),
    ).rejects.toMatchObject({ code: "23001" });
    await client.query("ROLLBACK TO SAVEPOINT company_with_opportunity");
  });
});
