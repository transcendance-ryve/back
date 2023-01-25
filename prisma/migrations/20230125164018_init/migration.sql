-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('public', 'private', 'protected', 'directmessage');

-- CreateEnum
CREATE TYPE "ChannelRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "ChannelActionType" AS ENUM ('ban', 'mute');

-- CreateEnum
CREATE TYPE "_status" AS ENUM ('offline', 'online', 'ingame');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'declined', 'none');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "auth" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT NOT NULL DEFAULT 'http://localhost:3000/avatars/default.png',
    "status" "_status" NOT NULL DEFAULT 'offline',
    "level" INTEGER NOT NULL DEFAULT 0,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "next_level" INTEGER NOT NULL DEFAULT 100,
    "rank_point" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "loses" INTEGER NOT NULL DEFAULT 0,
    "played" INTEGER NOT NULL DEFAULT 0,
    "tfa_token" TEXT,
    "tfa_secret" TEXT,
    "tfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "channel_id" TEXT,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,

    CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "player_one_id" TEXT NOT NULL,
    "player_one_score" INTEGER NOT NULL DEFAULT 0,
    "player_one_level" INTEGER NOT NULL DEFAULT 0,
    "player_one_experience" INTEGER NOT NULL DEFAULT 0,
    "player_one_next_level" INTEGER NOT NULL DEFAULT 100,
    "player_two_id" TEXT NOT NULL,
    "player_two_score" INTEGER NOT NULL DEFAULT 0,
    "player_two_level" INTEGER NOT NULL DEFAULT 0,
    "player_two_experience" INTEGER NOT NULL DEFAULT 0,
    "player_two_next_level" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "status" "ChannelType" NOT NULL DEFAULT 'public',
    "password" TEXT,
    "avatar" TEXT NOT NULL DEFAULT 'http://localhost:3000/avatars/default.png',
    "usersCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_invites" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senderId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "channelId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,

    CONSTRAINT "channel_invites_pkey" PRIMARY KEY ("id")
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
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelActionTime" TIMESTAMP(3),
    "type" "ChannelActionType" NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_channel_id_key" ON "friendships"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_sender_id_receiver_id_key" ON "friendships"("sender_id", "receiver_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_users_user_id_blocked_id_key" ON "blocked_users"("user_id", "blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "games_id_key" ON "games"("id");

-- CreateIndex
CREATE UNIQUE INDEX "channels_name_key" ON "channels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "channel_invites_channelId_invitedUserId_key" ON "channel_invites"("channelId", "invitedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_actions_channelId_targetId_type_key" ON "channel_actions"("channelId", "targetId", "type");

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_player_one_id_fkey" FOREIGN KEY ("player_one_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_player_two_id_fkey" FOREIGN KEY ("player_two_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_users" ADD CONSTRAINT "channel_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_users" ADD CONSTRAINT "channel_users_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_actions" ADD CONSTRAINT "channel_actions_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
