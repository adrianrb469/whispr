ALTER TABLE "blockchain" RENAME COLUMN "previoushash" TO "previous_hash";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "mfa_enabled" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "blockchain" ADD COLUMN "conversation_id" integer;--> statement-breakpoint
ALTER TABLE "blockchain" ADD CONSTRAINT "blockchain_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;