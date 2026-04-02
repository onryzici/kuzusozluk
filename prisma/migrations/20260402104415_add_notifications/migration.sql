-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MENTION', 'REPLY', 'VOTE', 'FOLLOW', 'MESSAGE');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
