-- AlterTable
ALTER TABLE "friendships" ADD COLUMN     "DMId" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';
