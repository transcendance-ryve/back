-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tfa_secret" TEXT,
ALTER COLUMN "status" SET DEFAULT 'offline';
