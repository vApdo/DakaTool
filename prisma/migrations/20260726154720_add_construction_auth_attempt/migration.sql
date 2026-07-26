-- CreateTable
CREATE TABLE "ConstructionAuthAttempt" (
    "ip" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstructionAuthAttempt_pkey" PRIMARY KEY ("ip")
);
