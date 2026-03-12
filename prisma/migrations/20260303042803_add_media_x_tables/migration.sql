/*
  Warnings:

  - You are about to drop the `MediaMediaXTweetSource` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "MediaMediaXTweetSource";

-- CreateTable
CREATE TABLE "MediaXTweetSource" (
    "id" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "xAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullContent" TEXT NOT NULL,
    "fullContentZh" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaXTweetSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaXTweetReport" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "rangeStart" TIMESTAMP(3) NOT NULL,
    "rangeEnd" TIMESTAMP(3) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "summaryZh" TEXT NOT NULL,
    "highlightsEn" TEXT NOT NULL,
    "highlightsZh" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "usedAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaXTweetReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaXTweetSource_reportDate_period_idx" ON "MediaXTweetSource"("reportDate", "period");

-- CreateIndex
CREATE INDEX "MediaXTweetSource_xAccountId_idx" ON "MediaXTweetSource"("xAccountId");

-- CreateIndex
CREATE INDEX "MediaXTweetSource_username_createdAt_idx" ON "MediaXTweetSource"("username", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaXTweetSource_reportDate_period_xAccountId_key" ON "MediaXTweetSource"("reportDate", "period", "xAccountId");

-- CreateIndex
CREATE INDEX "MediaXTweetReport_period_reportDate_idx" ON "MediaXTweetReport"("period", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "MediaXTweetReport_period_reportDate_key" ON "MediaXTweetReport"("period", "reportDate");
