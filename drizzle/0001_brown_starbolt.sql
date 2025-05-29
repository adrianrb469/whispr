CREATE TYPE "public"."conversation_type" AS ENUM('DIRECT', 'GROUP');--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "type" "conversation_type" DEFAULT 'DIRECT' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD COLUMN "initial_payload" jsonb;