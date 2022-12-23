-- DropForeignKey
ALTER TABLE "friendships" DROP CONSTRAINT "friendships_senderId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "loses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "played" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wins" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'offline';

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
