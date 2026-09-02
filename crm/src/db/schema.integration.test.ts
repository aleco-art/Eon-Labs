import { randomUUID } from "node:crypto";

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

  it("inserts a contact with a valid company", async () => {
    const company = await createCompany();
    const contact = await createContact(company.id);

    expect(contact.companyId).toBe(company.id);
  });

  it("rejects a contact without a valid company", async () => {
    await expect(
      client.query(
        "INSERT INTO contacts (first_name, last_name, company_id) VALUES ($1, $2, $3)",
        ["Grace", "Hopper", randomUUID()],
      ),
    ).rejects.toMatchObject({ code: "23503" });
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
