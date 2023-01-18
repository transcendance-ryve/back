-- AlterTable
ALTER TABLE "games" ALTER COLUMN "player_one_score" SET DEFAULT 0,
ALTER COLUMN "player_one_level" SET DEFAULT 0,
ALTER COLUMN "player_one_experience" SET DEFAULT 0,
ALTER COLUMN "player_one_next_level" SET DEFAULT 100,
ALTER COLUMN "player_two_score" SET DEFAULT 0,
ALTER COLUMN "player_two_level" SET DEFAULT 0,
ALTER COLUMN "player_two_experience" SET DEFAULT 0,
ALTER COLUMN "player_two_next_level" SET DEFAULT 100;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';
