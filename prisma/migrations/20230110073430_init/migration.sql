-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "avatar" TEXT NOT NULL DEFAULT 'http://localhost:3000/default.png';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';
