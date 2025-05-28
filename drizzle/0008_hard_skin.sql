-- First, drop the existing primary key constraint
ALTER TABLE "users_otp" DROP CONSTRAINT IF EXISTS "users_otp_pkey";

-- Add client_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users_otp' 
        AND column_name = 'client_id'
    ) THEN
        ALTER TABLE "users_otp" ADD COLUMN "client_id" integer NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Make id just an auto-incrementing integer without primary key
ALTER TABLE "users_otp" ALTER COLUMN "id" DROP NOT NULL;

-- Add the new compound primary key
ALTER TABLE "users_otp" ADD CONSTRAINT "pk_users_otp" PRIMARY KEY ("user_id", "client_id");
