-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "banReason" VARCHAR(500);

-- CreateTable
CREATE TABLE "BannedIp" (
    "id" TEXT NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "reason" VARCHAR(500),
    "bannedBy" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BannedIp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BannedIp_ipAddress_key" ON "BannedIp"("ipAddress");

-- CreateIndex
CREATE INDEX "BannedIp_ipAddress_idx" ON "BannedIp"("ipAddress");

-- CreateIndex
CREATE INDEX "BannedIp_userId_idx" ON "BannedIp"("userId");
