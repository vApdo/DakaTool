-- CreateEnum
CREATE TYPE "PaymentRequestAction" AS ENUM ('DOWNLOAD', 'PRINT');

-- CreateTable
CREATE TABLE "AppAccessAttempt" (
    "ip" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppAccessAttempt_pkey" PRIMARY KEY ("ip")
);

-- CreateTable
CREATE TABLE "PaymentRequestHistory" (
    "id" TEXT NOT NULL,
    "action" "PaymentRequestAction" NOT NULL,
    "requestDate" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "totalVnd" BIGINT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRequestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentRequestHistory_createdAt_idx" ON "PaymentRequestHistory"("createdAt");
