-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'QUEUED', 'EXTRACTING_AUDIO', 'TRANSCRIBING', 'FORMATTING', 'READY', 'RENDERING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('TRANSCRIBE', 'RENDER_VIDEO', 'GENERATE_EXPORT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('SRT', 'VTT', 'ASS', 'BURNED_MP4');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "SubtitleProject" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "sourceFilename" TEXT NOT NULL,
    "sourceMimeType" TEXT NOT NULL,
    "sourceSizeBytes" BIGINT NOT NULL,
    "sourceStorageKey" TEXT NOT NULL,
    "durationMs" INTEGER,
    "detectedLanguage" TEXT,
    "requestedLanguage" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'UPLOADING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "subtitleStyle" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SubtitleProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtitleSegment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "speaker" TEXT,
    "words" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubtitleSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtitleJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "bullJobId" TEXT,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubtitleJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtitleExport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ExportType" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SubtitleExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubtitleProject_createdAt_idx" ON "SubtitleProject"("createdAt");

-- CreateIndex
CREATE INDEX "SubtitleSegment_projectId_idx" ON "SubtitleSegment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SubtitleSegment_projectId_order_key" ON "SubtitleSegment"("projectId", "order");

-- CreateIndex
CREATE INDEX "SubtitleJob_projectId_idx" ON "SubtitleJob"("projectId");

-- CreateIndex
CREATE INDEX "SubtitleExport_projectId_idx" ON "SubtitleExport"("projectId");

-- AddForeignKey
ALTER TABLE "SubtitleSegment" ADD CONSTRAINT "SubtitleSegment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SubtitleProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtitleJob" ADD CONSTRAINT "SubtitleJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SubtitleProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtitleExport" ADD CONSTRAINT "SubtitleExport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SubtitleProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
