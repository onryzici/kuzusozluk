-- Add generation column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "generation" INTEGER NOT NULL DEFAULT 1;
