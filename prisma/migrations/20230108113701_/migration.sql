/*
  Warnings:

  - The primary key for the `channel_invites` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[channelId,invitedUserId]` on the table `channel_invites` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `channel_invites` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "channel_invites" DROP CONSTRAINT "channel_invites_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "channel_invites_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';

-- CreateIndex
CREATE UNIQUE INDEX "channel_invites_channelId_invitedUserId_key" ON "channel_invites"("channelId", "invitedUserId");
