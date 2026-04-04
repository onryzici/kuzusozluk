-- CreateTable
CREATE TABLE "Ukde" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "topicSlug" TEXT,

    CONSTRAINT "Ukde_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ukde_createdAt_idx" ON "Ukde"("createdAt");

-- AddForeignKey
ALTER TABLE "Ukde" ADD CONSTRAINT "Ukde_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ukde" ADD CONSTRAINT "Ukde_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
