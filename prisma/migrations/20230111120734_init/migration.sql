/*
  Warnings:

  - You are about to drop the column `friendshipId` on the `channels` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[channel_id]` on the table `friendships` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "channels" DROP CONSTRAINT "channels_friendshipId_fkey";

-- DropIndex
DROP INDEX "channels_friendshipId_key";

-- AlterTable
ALTER TABLE "channels" DROP COLUMN "friendshipId";

-- AlterTable
ALTER TABLE "friendships" ADD COLUMN     "channel_id" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';

-- CreateIndex
CREATE UNIQUE INDEX "friendships_channel_id_key" ON "friendships"("channel_id");

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
