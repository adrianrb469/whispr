ALTER TABLE "users" ALTER COLUMN "mfa_enabled" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users_otp" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users_otp" ADD CONSTRAINT "pk_users_otp" PRIMARY KEY("user_id","client_id");--> statement-breakpoint
ALTER TABLE "users_otp" ADD COLUMN "client_id" integer NOT NULL;