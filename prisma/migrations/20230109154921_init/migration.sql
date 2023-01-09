-- AlterTable
ALTER TABLE "channel_actions" ALTER COLUMN "channelActionTime" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';
