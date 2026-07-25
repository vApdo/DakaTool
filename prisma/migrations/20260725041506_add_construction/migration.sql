-- CreateEnum
CREATE TYPE "ConstructionStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE', 'DELAYED');

-- CreateEnum
CREATE TYPE "ConstructionFileKind" AS ENUM ('PLAN', 'BUDGET', 'OTHER');

-- CreateTable
CREATE TABLE "ConstructionProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ConstructionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstructionProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstructionUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionPhoto" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConstructionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "percent" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConstructionMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionCostItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedVnd" BIGINT NOT NULL,
    "actualVnd" BIGINT NOT NULL DEFAULT 0,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConstructionCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ConstructionFileKind" NOT NULL DEFAULT 'OTHER',
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstructionFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConstructionUpdate_projectId_createdAt_idx" ON "ConstructionUpdate"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ConstructionPhoto_updateId_idx" ON "ConstructionPhoto"("updateId");

-- CreateIndex
CREATE INDEX "ConstructionMilestone_projectId_idx" ON "ConstructionMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ConstructionCostItem_projectId_idx" ON "ConstructionCostItem"("projectId");

-- CreateIndex
CREATE INDEX "ConstructionFile_projectId_idx" ON "ConstructionFile"("projectId");

-- AddForeignKey
ALTER TABLE "ConstructionUpdate" ADD CONSTRAINT "ConstructionUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionPhoto" ADD CONSTRAINT "ConstructionPhoto_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "ConstructionUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionMilestone" ADD CONSTRAINT "ConstructionMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionCostItem" ADD CONSTRAINT "ConstructionCostItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionFile" ADD CONSTRAINT "ConstructionFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ConstructionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
