-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('ACTIVATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_token_key" ON "EmailToken"("token");

-- CreateIndex
CREATE INDEX "EmailToken_token_idx" ON "EmailToken"("token");

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
