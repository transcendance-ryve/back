-- AlterEnum
ALTER TYPE "InviteStatus" ADD VALUE 'none';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';
