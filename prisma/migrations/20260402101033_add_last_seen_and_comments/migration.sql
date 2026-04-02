-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_entryId_createdAt_idx" ON "Comment"("entryId", "createdAt");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
