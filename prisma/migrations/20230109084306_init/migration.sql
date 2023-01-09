/*
  Warnings:

  - The primary key for the `channel_actions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `channelId` on the `channel_actions` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `channel_actions` table. All the data in the column will be lost.
  - You are about to drop the column `senderId` on the `channel_actions` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `channel_actions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[channelActionOnChanId,channelActionTargetId,type]` on the table `channel_actions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `channelActionOnChanId` to the `channel_actions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `channelActionSenderId` to the `channel_actions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `channelActionTargetId` to the `channel_actions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "channel_actions" DROP CONSTRAINT "channel_actions_channelId_fkey";

-- DropForeignKey
ALTER TABLE "channel_actions" DROP CONSTRAINT "channel_actions_senderId_fkey";

-- DropForeignKey
ALTER TABLE "channel_actions" DROP CONSTRAINT "channel_actions_targetId_fkey";

-- DropIndex
DROP INDEX "channel_actions_channelId_targetId_type_key";

-- AlterTable
ALTER TABLE "channel_actions" DROP CONSTRAINT "channel_actions_pkey",
DROP COLUMN "channelId",
DROP COLUMN "id",
DROP COLUMN "senderId",
DROP COLUMN "targetId",
ADD COLUMN     "channelActionOnChanId" TEXT NOT NULL,
ADD COLUMN     "channelActionSenderId" TEXT NOT NULL,
ADD COLUMN     "channelActionTargetId" TEXT NOT NULL,
ADD CONSTRAINT "channel_actions_pkey" PRIMARY KEY ("channelActionSenderId", "channelActionTargetId", "channelActionOnChanId", "type");

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';

-- CreateIndex
CREATE UNIQUE INDEX "channel_actions_channelActionOnChanId_channelActionTargetId_key" ON "channel_actions"("channelActionOnChanId", "channelActionTargetId", "type");

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_channelActionSenderId_fkey" FOREIGN KEY ("channelActionSenderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_channelActionTargetId_fkey" FOREIGN KEY ("channelActionTargetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_channelActionOnChanId_fkey" FOREIGN KEY ("channelActionOnChanId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
