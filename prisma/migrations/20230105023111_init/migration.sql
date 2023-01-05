/*
  Warnings:

  - You are about to drop the column `receiverId` on the `friendships` table. All the data in the column will be lost.
  - You are about to drop the column `senderId` on the `friendships` table. All the data in the column will be lost.
  - You are about to drop the column `isAuth` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `nextLevel` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `rankPoint` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `tokens` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sender_id,receiver_id]` on the table `friendships` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `receiver_id` to the `friendships` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_id` to the `friendships` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "friendships" DROP CONSTRAINT "friendships_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "friendships" DROP CONSTRAINT "friendships_senderId_fkey";

-- DropForeignKey
ALTER TABLE "tokens" DROP CONSTRAINT "tokens_userId_fkey";

-- DropIndex
DROP INDEX "friendships_senderId_receiverId_key";

-- AlterTable
ALTER TABLE "friendships" DROP COLUMN "receiverId",
DROP COLUMN "senderId",
ADD COLUMN     "receiver_id" TEXT NOT NULL,
ADD COLUMN     "sender_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isAuth",
DROP COLUMN "nextLevel",
DROP COLUMN "rankPoint",
ADD COLUMN     "auth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "next_level" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "rank_point" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'offline';

-- DropTable
DROP TABLE "tokens";

-- CreateIndex
CREATE UNIQUE INDEX "friendships_sender_id_receiver_id_key" ON "friendships"("sender_id", "receiver_id");

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
