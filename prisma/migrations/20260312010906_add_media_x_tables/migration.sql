/*
  Warnings:

  - A unique constraint covering the columns `[stripeConnectAccountId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[achConnectAccountId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "KnowledgeImage" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'image',
ADD COLUMN     "thumbnailBlobUrl" TEXT;

-- AlterTable
ALTER TABLE "KnowledgeSource" ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'website';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "abGroup" TEXT,
ADD COLUMN     "abScore" DOUBLE PRECISION,
ADD COLUMN     "likes" INTEGER,
ADD COLUMN     "replies" INTEGER,
ADD COLUMN     "retweets" INTEGER,
ADD COLUMN     "threadId" TEXT,
ADD COLUMN     "threadOrder" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "achBankLast4" TEXT,
ADD COLUMN     "achBankName" TEXT,
ADD COLUMN     "achConnectAccountId" TEXT,
ADD COLUMN     "achConnectStatus" TEXT,
ADD COLUMN     "contentProfile" TEXT,
ADD COLUMN     "contentProfileUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "seedanceApiKey" TEXT,
ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeConnectStatus" TEXT,
ADD COLUMN     "weixinCookie" TEXT;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "budgetCents" INTEGER,
    "budgetNote" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "aiAnalysis" TEXT,
    "aiAnalyzedAt" TIMESTAMP(3),
    "aiBudget" TEXT,
    "aiBudgetAt" TIMESTAMP(3),
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMaterial" (
    "id" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT NOT NULL,
    "knowledgeSourceId" TEXT,
    "knowledgeImageId" TEXT,

    CONSTRAINT "CampaignMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAttachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CampaignAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPayment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "budgetCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "totalChargeCents" INTEGER NOT NULL,
    "ownerPayoutCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "netAmountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'standard',
    "destination" TEXT NOT NULL DEFAULT 'connect',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripeTransferId" TEXT,
    "stripePayoutId" TEXT,
    "failedReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xAccountId" TEXT,
    "followersCount" INTEGER NOT NULL,
    "followingCount" INTEGER NOT NULL,
    "tweetCount" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'track',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "MonitorKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorTweet" (
    "id" TEXT NOT NULL,
    "tweetId" TEXT NOT NULL,
    "tweetUrl" TEXT NOT NULL,
    "authorUsername" TEXT,
    "authorName" TEXT,
    "text" TEXT NOT NULL,
    "tweetCreatedAt" TIMESTAMP(3),
    "impressions" INTEGER,
    "likes" INTEGER,
    "retweets" INTEGER,
    "replies" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sentiment" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "keyTopics" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "analysisMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "MonitorTweet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentimentSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "positiveCount" INTEGER NOT NULL DEFAULT 0,
    "negativeCount" INTEGER NOT NULL DEFAULT 0,
    "neutralCount" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tweetCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "SentimentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorTopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameZh" TEXT,
    "description" TEXT,
    "keywords" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MonitorTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicSnapshot" (
    "id" TEXT NOT NULL,
    "tweetCount" INTEGER NOT NULL DEFAULT 0,
    "positiveCount" INTEGER NOT NULL DEFAULT 0,
    "negativeCount" INTEGER NOT NULL DEFAULT 0,
    "neutralCount" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "themes" TEXT,
    "topTweets" TEXT,
    "aiSummary" TEXT,
    "rawQuery" TEXT,
    "modelId" TEXT,
    "costCents" INTEGER,
    "publicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "TopicSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StitchJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "clipCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "resultUrl" TEXT,
    "error" TEXT,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StitchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "creditBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCreditTransaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "TeamCreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_shareToken_key" ON "Campaign"("shareToken");

-- CreateIndex
CREATE INDEX "Campaign_userId_status_idx" ON "Campaign"("userId", "status");

-- CreateIndex
CREATE INDEX "Campaign_userId_createdAt_idx" ON "Campaign"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_name_userId_key" ON "Campaign"("name", "userId");

-- CreateIndex
CREATE INDEX "CampaignMaterial_campaignId_idx" ON "CampaignMaterial"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMaterial_campaignId_knowledgeSourceId_key" ON "CampaignMaterial"("campaignId", "knowledgeSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMaterial_campaignId_knowledgeImageId_key" ON "CampaignMaterial"("campaignId", "knowledgeImageId");

-- CreateIndex
CREATE INDEX "CampaignAttachment_campaignId_idx" ON "CampaignAttachment"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPayment_campaignId_key" ON "CampaignPayment"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPayment_stripeSessionId_key" ON "CampaignPayment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "CampaignPayment_campaignId_idx" ON "CampaignPayment"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignPayment_paymentStatus_idx" ON "CampaignPayment"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripeTransferId_key" ON "Payout"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripePayoutId_key" ON "Payout"("stripePayoutId");

-- CreateIndex
CREATE INDEX "Payout_userId_status_idx" ON "Payout"("userId", "status");

-- CreateIndex
CREATE INDEX "Payout_userId_createdAt_idx" ON "Payout"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowerSnapshot_userId_recordedAt_idx" ON "FollowerSnapshot"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "FollowerSnapshot_xAccountId_recordedAt_idx" ON "FollowerSnapshot"("xAccountId", "recordedAt");

-- CreateIndex
CREATE INDEX "MonitorKeyword_campaignId_idx" ON "MonitorKeyword"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorKeyword_campaignId_keyword_key" ON "MonitorKeyword"("campaignId", "keyword");

-- CreateIndex
CREATE INDEX "MonitorTweet_campaignId_sentiment_idx" ON "MonitorTweet"("campaignId", "sentiment");

-- CreateIndex
CREATE INDEX "MonitorTweet_campaignId_createdAt_idx" ON "MonitorTweet"("campaignId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorTweet_campaignId_tweetId_key" ON "MonitorTweet"("campaignId", "tweetId");

-- CreateIndex
CREATE INDEX "SentimentSnapshot_campaignId_date_idx" ON "SentimentSnapshot"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SentimentSnapshot_campaignId_date_key" ON "SentimentSnapshot"("campaignId", "date");

-- CreateIndex
CREATE INDEX "MonitorTopic_userId_updatedAt_idx" ON "MonitorTopic"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorTopic_name_userId_key" ON "MonitorTopic"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicSnapshot_publicId_key" ON "TopicSnapshot"("publicId");

-- CreateIndex
CREATE INDEX "TopicSnapshot_topicId_createdAt_idx" ON "TopicSnapshot"("topicId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_isRevoked_idx" ON "ApiKey"("userId", "isRevoked");

-- CreateIndex
CREATE INDEX "StitchJob_userId_status_idx" ON "StitchJob"("userId", "status");

-- CreateIndex
CREATE INDEX "StitchJob_createdAt_idx" ON "StitchJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Team_inviteCode_key" ON "Team"("inviteCode");

-- CreateIndex
CREATE INDEX "Team_inviteCode_idx" ON "Team"("inviteCode");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_userId_teamId_key" ON "TeamMember"("userId", "teamId");

-- CreateIndex
CREATE INDEX "TeamInvitation_email_status_idx" ON "TeamInvitation"("email", "status");

-- CreateIndex
CREATE INDEX "TeamInvitation_teamId_idx" ON "TeamInvitation"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_teamId_email_status_key" ON "TeamInvitation"("teamId", "email", "status");

-- CreateIndex
CREATE INDEX "TeamCreditTransaction_teamId_createdAt_idx" ON "TeamCreditTransaction"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeImage_knowledgeSourceId_mediaType_idx" ON "KnowledgeImage"("knowledgeSourceId", "mediaType");

-- CreateIndex
CREATE INDEX "Post_userId_createdAt_idx" ON "Post"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_status_scheduledAt_idx" ON "Post"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Post_userId_status_postedAt_idx" ON "Post"("userId", "status", "postedAt");

-- CreateIndex
CREATE INDEX "RecurringSchedule_isActive_nextRunAt_idx" ON "RecurringSchedule"("isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringSchedule_userId_isActive_idx" ON "RecurringSchedule"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_achConnectAccountId_key" ON "User"("achConnectAccountId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMaterial" ADD CONSTRAINT "CampaignMaterial_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMaterial" ADD CONSTRAINT "CampaignMaterial_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "KnowledgeSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMaterial" ADD CONSTRAINT "CampaignMaterial_knowledgeImageId_fkey" FOREIGN KEY ("knowledgeImageId") REFERENCES "KnowledgeImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAttachment" ADD CONSTRAINT "CampaignAttachment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAttachment" ADD CONSTRAINT "CampaignAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPayment" ADD CONSTRAINT "CampaignPayment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerSnapshot" ADD CONSTRAINT "FollowerSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerSnapshot" ADD CONSTRAINT "FollowerSnapshot_xAccountId_fkey" FOREIGN KEY ("xAccountId") REFERENCES "XAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorKeyword" ADD CONSTRAINT "MonitorKeyword_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorTweet" ADD CONSTRAINT "MonitorTweet_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentimentSnapshot" ADD CONSTRAINT "SentimentSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorTopic" ADD CONSTRAINT "MonitorTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicSnapshot" ADD CONSTRAINT "TopicSnapshot_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "MonitorTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StitchJob" ADD CONSTRAINT "StitchJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCreditTransaction" ADD CONSTRAINT "TeamCreditTransaction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
