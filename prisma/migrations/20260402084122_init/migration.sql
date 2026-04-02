-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'AUTHOR', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UP', 'DOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" VARCHAR(50),
    "bio" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "karma" INTEGER NOT NULL DEFAULT 0,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "description" TEXT,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "dayCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "type" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicTag" (
    "topicId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TopicTag_pkey" PRIMARY KEY ("topicId","tagId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_karma_idx" ON "User"("karma");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_title_key" ON "Topic"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_slug_idx" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_dayCount_idx" ON "Topic"("dayCount");

-- CreateIndex
CREATE INDEX "Topic_entryCount_idx" ON "Topic"("entryCount");

-- CreateIndex
CREATE INDEX "Entry_topicId_createdAt_idx" ON "Entry"("topicId", "createdAt");

-- CreateIndex
CREATE INDEX "Entry_authorId_idx" ON "Entry"("authorId");

-- CreateIndex
CREATE INDEX "Entry_upvotes_idx" ON "Entry"("upvotes");

-- CreateIndex
CREATE INDEX "Vote_entryId_idx" ON "Vote"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_entryId_key" ON "Vote"("userId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_entryId_key" ON "Favorite"("userId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicTag" ADD CONSTRAINT "TopicTag_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicTag" ADD CONSTRAINT "TopicTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
