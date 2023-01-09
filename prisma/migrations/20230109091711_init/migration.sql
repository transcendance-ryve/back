/*
  Warnings:

  - You are about to drop the column `type` on the `channels` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "channels" DROP COLUMN "type",
ADD COLUMN     "status" "ChannelType" NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';
