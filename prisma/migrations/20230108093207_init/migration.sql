/*
  Warnings:

  - You are about to drop the `_channelInvites` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'declined');

-- DropForeignKey
ALTER TABLE "_channelInvites" DROP CONSTRAINT "_channelInvites_A_fkey";

-- DropForeignKey
ALTER TABLE "_channelInvites" DROP CONSTRAINT "_channelInvites_B_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';

-- DropTable
DROP TABLE "_channelInvites";

-- CreateTable
CREATE TABLE "channel_invites" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senderId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "channelId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,

    CONSTRAINT "channel_invites_pkey" PRIMARY KEY ("senderId","invitedUserId","channelId")
);

-- AddForeignKey
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
