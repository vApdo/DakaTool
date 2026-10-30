-- CreateEnum
CREATE TYPE "MktPostStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHING', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "MktPost" (
    "id" TEXT NOT NULL,
    "fbPageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "status" "MktPostStatus" NOT NULL DEFAULT 'DRAFT',
    "message" TEXT NOT NULL,
    "link" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "authorName" TEXT NOT NULL,
    "reviewerName" TEXT,
    "reviewNote" TEXT,
    "fbPostId" TEXT,
    "permalinkUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MktPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MktPostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MktPostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MktPostMetric" (
    "postId" TEXT NOT NULL,
    "views" INTEGER,
    "uniqueViews" INTEGER,
    "clicks" INTEGER,
    "reactions" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MktPostMetric_pkey" PRIMARY KEY ("postId")
);

-- CreateIndex
CREATE INDEX "MktPost_status_idx" ON "MktPost"("status");

-- CreateIndex
CREATE INDEX "MktPost_scheduledAt_idx" ON "MktPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "MktPost_createdAt_idx" ON "MktPost"("createdAt");

-- CreateIndex
CREATE INDEX "MktPostMedia_postId_idx" ON "MktPostMedia"("postId");

-- AddForeignKey
ALTER TABLE "MktPostMedia" ADD CONSTRAINT "MktPostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MktPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MktPostMetric" ADD CONSTRAINT "MktPostMetric_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MktPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

