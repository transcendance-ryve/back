-- AlterTable
ALTER TABLE "channels" ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';
