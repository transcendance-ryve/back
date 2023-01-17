/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `games` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "games" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';

-- CreateIndex
CREATE UNIQUE INDEX "games_id_key" ON "games"("id");
