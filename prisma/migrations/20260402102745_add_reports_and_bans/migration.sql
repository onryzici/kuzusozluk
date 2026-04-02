-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reporterId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_entryId_idx" ON "Report"("entryId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
