-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "player_one_id" TEXT NOT NULL,
    "player_one_score" INTEGER NOT NULL,
    "player_two_id" TEXT NOT NULL,
    "player_two_score" INTEGER NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_player_one_id_fkey" FOREIGN KEY ("player_one_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_player_two_id_fkey" FOREIGN KEY ("player_two_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
