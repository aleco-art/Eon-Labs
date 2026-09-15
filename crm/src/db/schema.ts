import { sql } from "drizzle-orm";
import {
  char,
  check,
  foreignKey,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const opportunityStatus = pgEnum("opportunity_status", [
  "NEW",
  "IN_CONVERSATION",
  "PROPOSAL",
  "WON",
  "LOST",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    website: varchar("website", { length: 2048 }),
    phone: varchar("phone", { length: 50 }),
    description: text("description"),
    ...timestamps,
  },
  (table) => [
    check(
      "companies_name_nonblank",
      sql`char_length(btrim(${table.name})) > 0`,
    ),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 50 }),
    jobTitle: varchar("job_title", { length: 160 }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("contacts_company_id_idx").on(table.companyId),
    unique("contacts_id_company_id_unique").on(table.id, table.companyId),
  ],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    contactId: uuid("contact_id"),
    status: opportunityStatus("status").notNull(),
    valueAmount: numeric("value_amount", { precision: 14, scale: 2 }),
    currencyCode: char("currency_code", { length: 3 }),
    ...timestamps,
  },
  (table) => [
    index("opportunities_company_id_idx").on(table.companyId),
    index("opportunities_contact_id_idx").on(table.contactId),
    index("opportunities_status_idx").on(table.status),
    foreignKey({
      columns: [table.contactId, table.companyId],
      foreignColumns: [contacts.id, contacts.companyId],
      name: "opportunities_contact_company_fk",
    }),
    check(
      "opportunities_value_amount_nonnegative",
      sql`${table.valueAmount} >= 0`,
    ),
    check(
      "opportunities_amount_currency_pair",
      sql`(${table.valueAmount} IS NULL AND ${table.currencyCode} IS NULL) OR (${table.valueAmount} IS NOT NULL AND ${table.currencyCode} IS NOT NULL)`,
    ),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    body: text("body").notNull(),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
      onDelete: "cascade",
    }),
    ...timestamps,
  },
  (table) => [
    check(
      "notes_exactly_one_target",
      sql`num_nonnulls(${table.companyId}, ${table.contactId}, ${table.opportunityId}) = 1`,
    ),
  ],
);
