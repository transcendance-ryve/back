/*
  Warnings:

  - The primary key for the `channel_actions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `channelActionOnChanId` on the `channel_actions` table. All the data in the column will be lost.
  - You are about to drop the column `channelActionSenderId` on the `channel_actions` table. All the data in the column will be lost.
  - You are about to drop the column `channelActionTargetId` on the `channel_actions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[channelId,targetId,type]` on the table `channel_actions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `channelId` to the `channel_actions` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `channel_actions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `senderId` to the `channel_actions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetId` to the `channel_actions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "channel_actions" DROP CONSTRAINT "channel_actions_channelActionOnChanId_fkey";

-- DropForeignKey
ALTER TABLE "channel_actions" DROP CONSTRAINT "channel_actions_channelActionSenderId_fkey";

-- DropForeignKey
ALTER TABLE "channel_actions" DROP CONSTRAINT "channel_actions_channelActionTargetId_fkey";

-- DropIndex
DROP INDEX "channel_actions_channelActionOnChanId_channelActionTargetId_key";

-- AlterTable
ALTER TABLE "channel_actions" DROP CONSTRAINT "channel_actions_pkey",
DROP COLUMN "channelActionOnChanId",
DROP COLUMN "channelActionSenderId",
DROP COLUMN "channelActionTargetId",
ADD COLUMN     "channelId" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "senderId" TEXT NOT NULL,
ADD COLUMN     "targetId" TEXT NOT NULL,
ADD CONSTRAINT "channel_actions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';

-- CreateIndex
CREATE UNIQUE INDEX "channel_actions_channelId_targetId_type_key" ON "channel_actions"("channelId", "targetId", "type");

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
