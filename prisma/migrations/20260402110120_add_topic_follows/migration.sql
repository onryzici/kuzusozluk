-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TOPIC_ENTRY';

-- CreateTable
CREATE TABLE "TopicFollow" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "TopicFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicFollow_userId_topicId_key" ON "TopicFollow"("userId", "topicId");

-- AddForeignKey
ALTER TABLE "TopicFollow" ADD CONSTRAINT "TopicFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicFollow" ADD CONSTRAINT "TopicFollow_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
