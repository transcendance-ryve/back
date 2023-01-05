-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tfa_token" TEXT,
ALTER COLUMN "status" SET DEFAULT 'offline';
