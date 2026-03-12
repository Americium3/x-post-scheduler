/*
  Warnings:

  - You are about to drop the `XAccountSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `XTweetSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "XAccountSnapshot";

-- DropTable
DROP TABLE "XTweetSnapshot";

-- CreateTable
CREATE TABLE "MediaMonitorXAccounts" (
    "id" TEXT NOT NULL,
    "xAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaMonitorXAccounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaMediaXTweetSource" (
    "id" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "xAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullContent" TEXT NOT NULL,
    "fullContentZh" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaMediaXTweetSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaMonitorXAccounts_xAccountId_idx" ON "MediaMonitorXAccounts"("xAccountId");

-- CreateIndex
CREATE INDEX "MediaMonitorXAccounts_username_idx" ON "MediaMonitorXAccounts"("username");

-- CreateIndex
CREATE INDEX "MediaMediaXTweetSource_reportDate_period_idx" ON "MediaMediaXTweetSource"("reportDate", "period");

-- CreateIndex
CREATE INDEX "MediaMediaXTweetSource_xAccountId_idx" ON "MediaMediaXTweetSource"("xAccountId");

-- CreateIndex
CREATE INDEX "MediaMediaXTweetSource_username_createdAt_idx" ON "MediaMediaXTweetSource"("username", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaMediaXTweetSource_reportDate_period_xAccountId_key" ON "MediaMediaXTweetSource"("reportDate", "period", "xAccountId");
