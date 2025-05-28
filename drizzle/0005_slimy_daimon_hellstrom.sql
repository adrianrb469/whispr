ALTER TABLE "users" ADD COLUMN "mfa_secret" varchar(255) DEFAULT '';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_enabled" boolean DEFAULT false;