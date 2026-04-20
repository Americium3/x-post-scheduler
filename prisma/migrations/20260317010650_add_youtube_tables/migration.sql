/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "platform" TEXT NOT NULL DEFAULT 'x',
ADD COLUMN     "videoDescription" TEXT,
ADD COLUMN     "videoTitle" TEXT,
ADD COLUMN     "videoVisibility" TEXT,
ADD COLUMN     "youtubeAccountId" TEXT,
ADD COLUMN     "youtubeVideoId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredByUserId" TEXT;

-- CreateTable
CREATE TABLE "ReferralCommission" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceAmountCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'earned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouTubeAccount" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "channelTitle" TEXT,
    "channelId" TEXT,
    "subscriberCount" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "accessTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "YouTubeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferralCommission_referrerId_createdAt_idx" ON "ReferralCommission"("referrerId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralCommission_referredUserId_createdAt_idx" ON "ReferralCommission"("referredUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralCommission_stripeSessionId_idx" ON "ReferralCommission"("stripeSessionId");

-- CreateIndex
CREATE INDEX "YouTubeAccount_userId_isDefault_idx" ON "YouTubeAccount"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "Post_platform_idx" ON "Post"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_youtubeAccountId_fkey" FOREIGN KEY ("youtubeAccountId") REFERENCES "YouTubeAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeAccount" ADD CONSTRAINT "YouTubeAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
