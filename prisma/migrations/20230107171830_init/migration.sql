-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('public', 'private', 'protected', 'directmessage');

-- CreateEnum
CREATE TYPE "ChannelRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "ChannelActionType" AS ENUM ('ban', 'mute');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL DEFAULT 'public',
    "password" TEXT,
    "usersCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senderId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_users" (
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "role" "ChannelRole" NOT NULL DEFAULT 'member',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_users_pkey" PRIMARY KEY ("userId","channelId")
);

-- CreateTable
CREATE TABLE "channel_actions" (
    "channelActionSenderId" TEXT NOT NULL,
    "channelActionTargetId" TEXT NOT NULL,
    "channelActionOnChanId" TEXT NOT NULL,
    "channelActionTime" TIMESTAMP(3) NOT NULL,
    "type" "ChannelActionType" NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_actions_pkey" PRIMARY KEY ("channelActionSenderId","channelActionTargetId","channelActionOnChanId","type")
);

-- CreateTable
CREATE TABLE "_channelInvites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "channels_name_key" ON "channels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "channel_actions_channelActionOnChanId_channelActionTargetId_key" ON "channel_actions"("channelActionOnChanId", "channelActionTargetId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "_channelInvites_AB_unique" ON "_channelInvites"("A", "B");

-- CreateIndex
CREATE INDEX "_channelInvites_B_index" ON "_channelInvites"("B");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_users" ADD CONSTRAINT "channel_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_users" ADD CONSTRAINT "channel_users_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_channelActionSenderId_fkey" FOREIGN KEY ("channelActionSenderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_channelActionTargetId_fkey" FOREIGN KEY ("channelActionTargetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_channelActionOnChanId_fkey" FOREIGN KEY ("channelActionOnChanId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_channelInvites" ADD CONSTRAINT "_channelInvites_A_fkey" FOREIGN KEY ("A") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_channelInvites" ADD CONSTRAINT "_channelInvites_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
