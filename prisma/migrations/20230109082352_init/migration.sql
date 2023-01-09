/*
  Warnings:

  - You are about to drop the column `accepted` on the `friendships` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "friendships" DROP COLUMN "accepted",
ADD COLUMN     "status" "InviteStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';
