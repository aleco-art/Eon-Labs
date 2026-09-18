CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TYPE "public"."opportunity_status" AS ENUM('NEW', 'IN_CONVERSATION', 'PROPOSAL', 'WON', 'LOST');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"website" varchar(2048),
	"phone" varchar(50),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_nonblank" CHECK (char_length(btrim("companies"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(320),
	"phone" varchar(50),
	"job_title" varchar(160),
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_id_company_id_unique" UNIQUE("id","company_id")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body" text NOT NULL,
	"company_id" uuid,
	"contact_id" uuid,
	"opportunity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_exactly_one_target" CHECK (num_nonnulls("notes"."company_id", "notes"."contact_id", "notes"."opportunity_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"company_id" uuid NOT NULL,
	"contact_id" uuid,
	"status" "opportunity_status" NOT NULL,
	"value_amount" numeric(14, 2),
	"currency_code" char(3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunities_value_amount_nonnegative" CHECK ("opportunities"."value_amount" >= 0),
	CONSTRAINT "opportunities_amount_currency_pair" CHECK (("opportunities"."value_amount" IS NULL AND "opportunities"."currency_code" IS NULL) OR ("opportunities"."value_amount" IS NOT NULL AND "opportunities"."currency_code" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contact_company_fk" FOREIGN KEY ("contact_id","company_id") REFERENCES "public"."contacts"("id","company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_company_id_idx" ON "contacts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "opportunities_company_id_idx" ON "opportunities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "opportunities_contact_id_idx" ON "opportunities" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "opportunities_status_idx" ON "opportunities" USING btree ("status");
