ALTER TABLE "channel_messages" ADD COLUMN "reply_to_id" uuid;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD COLUMN "message_type" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD COLUMN "read_by" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_reply_to_id_channel_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."channel_messages"("id") ON DELETE no action ON UPDATE no action;