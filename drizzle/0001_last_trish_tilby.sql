CREATE TABLE "users_bundle" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"identity_key" jsonb,
	"signed_prekey" jsonb,
	"prekey_signature" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "users_otp" (
	"user_id" integer,
	"one_time_prekey" jsonb,
	"id" integer PRIMARY KEY DEFAULT nextval('otpkey_sequence'::regclass) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_members" ALTER COLUMN "conversation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_members" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "initial_payload" jsonb;--> statement-breakpoint
ALTER TABLE "users_bundle" ADD CONSTRAINT "users_bundle_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_otp" ADD CONSTRAINT "user_otp_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;