ALTER TABLE "tasks" ADD COLUMN "migrated_from" text;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "migrated_from" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "migrated_from" text;