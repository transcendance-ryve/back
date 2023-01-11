/*
  Warnings:

  - You are about to drop the column `DMId` on the `friendships` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[friendshipId]` on the table `channels` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "friendshipId" TEXT;

-- AlterTable
ALTER TABLE "friendships" DROP COLUMN "DMId";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';

-- CreateIndex
CREATE UNIQUE INDEX "channels_friendshipId_key" ON "channels"("friendshipId");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_friendshipId_fkey" FOREIGN KEY ("friendshipId") REFERENCES "friendships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
