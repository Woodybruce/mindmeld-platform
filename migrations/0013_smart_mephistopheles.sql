CREATE TYPE "public"."renewal_category" AS ENUM('passport', 'driving_licence', 'mot', 'insurance', 'tax', 'subscription', 'membership', 'other');--> statement-breakpoint
CREATE TABLE "renewals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"label" text NOT NULL,
	"category" "renewal_category" DEFAULT 'other' NOT NULL,
	"renewal_date" date NOT NULL,
	"dependent_id" uuid,
	"member_user_id" text,
	"remind_before_days" integer DEFAULT 30 NOT NULL,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "renewals" ADD CONSTRAINT "renewals_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewals" ADD CONSTRAINT "renewals_dependent_id_dependents_id_fk" FOREIGN KEY ("dependent_id") REFERENCES "public"."dependents"("id") ON DELETE no action ON UPDATE no action;