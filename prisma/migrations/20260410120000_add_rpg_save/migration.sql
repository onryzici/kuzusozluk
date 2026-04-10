-- CreateTable
CREATE TABLE "RpgSave" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "charName" VARCHAR(30) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "bossesKilled" INTEGER NOT NULL DEFAULT 0,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RpgSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RpgSave_userId_key" ON "RpgSave"("userId");

-- CreateIndex
CREATE INDEX "RpgSave_level_idx" ON "RpgSave"("level");

-- CreateIndex
CREATE INDEX "RpgSave_bossesKilled_idx" ON "RpgSave"("bossesKilled");

-- AddForeignKey
ALTER TABLE "RpgSave" ADD CONSTRAINT "RpgSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
