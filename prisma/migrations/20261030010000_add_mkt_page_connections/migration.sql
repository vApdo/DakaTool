-- CreateTable
CREATE TABLE "MktPageConnection" (
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "connectedBy" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MktPageConnection_pkey" PRIMARY KEY ("pageId")
);
