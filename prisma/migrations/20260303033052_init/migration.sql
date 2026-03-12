-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "auth0Sub" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "picture" TEXT,
    "xApiKey" TEXT,
    "xApiSecret" TEXT,
    "xAccessToken" TEXT,
    "xAccessTokenSecret" TEXT,
    "creditBalanceCents" INTEGER NOT NULL DEFAULT 500,
    "language" TEXT NOT NULL DEFAULT 'en',
    "subscriptionTier" TEXT,
    "subscriptionStatus" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionPeriodEnd" TIMESTAMP(3),
    "loginStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastLoginDate" TIMESTAMP(3),
    "lastLoginRewardAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronRunEvent" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "success" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "triggeredBy" TEXT,
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronRunEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "tweetId" TEXT,
    "impressions" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mediaAssetId" TEXT,
    "userId" TEXT,
    "xAccountId" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringSchedule" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "useAi" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiLanguage" TEXT,
    "trendRegion" TEXT,
    "frequency" TEXT NOT NULL,
    "cronExpr" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "xAccountId" TEXT,

    CONSTRAINT "RecurringSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "pagesScraped" INTEGER NOT NULL DEFAULT 1,
    "lastScraped" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeImage" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "knowledgeSourceId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XAccount" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "username" TEXT,
    "followersCount" INTEGER,
    "followingCount" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "xApiKey" TEXT,
    "xApiSecret" TEXT,
    "xAccessToken" TEXT NOT NULL,
    "xAccessTokenSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "XAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "source" TEXT NOT NULL,
    "model" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "stripeSessionId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelLabel" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "inputImageUrl" TEXT,
    "generationMeta" TEXT,
    "aspectRatio" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryLike" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryComment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebVisit" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "WebVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelLabel" TEXT NOT NULL,
    "videoMode" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "segmentCount" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "generateAudio" BOOLEAN NOT NULL DEFAULT false,
    "i2vImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "segments" TEXT NOT NULL DEFAULT '[]',
    "completedUrls" TEXT,
    "stitchedUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VideoJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaIndustryReport" (
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

    CONSTRAINT "MediaIndustryReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaNewsSource" (
    "id" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fullContent" TEXT,
    "fullContentZh" TEXT,
    "titleZh" TEXT,
    "descriptionZh" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaNewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XAccountSnapshot" (
    "id" TEXT NOT NULL,
    "xAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XAccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XTweetSnapshot" (
    "id" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "xAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullContent" TEXT NOT NULL,
    "fullContentZh" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XTweetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Sub_key" ON "User"("auth0Sub");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CronRunEvent_jobName_createdAt_idx" ON "CronRunEvent"("jobName", "createdAt");

-- CreateIndex
CREATE INDEX "CronRunEvent_success_createdAt_idx" ON "CronRunEvent"("success", "createdAt");

-- CreateIndex
CREATE INDEX "CronRunEvent_endpoint_createdAt_idx" ON "CronRunEvent"("endpoint", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSource_url_userId_key" ON "KnowledgeSource"("url", "userId");

-- CreateIndex
CREATE INDEX "KnowledgeImage_userId_knowledgeSourceId_idx" ON "KnowledgeImage"("userId", "knowledgeSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeImage_knowledgeSourceId_sourceUrl_key" ON "KnowledgeImage"("knowledgeSourceId", "sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_sourceUrl_userId_key" ON "MediaAsset"("sourceUrl", "userId");

-- CreateIndex
CREATE INDEX "XAccount_userId_isDefault_idx" ON "XAccount"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_createdAt_idx" ON "UsageEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_source_createdAt_idx" ON "UsageEvent"("userId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_stripeSessionId_idx" ON "CreditTransaction"("stripeSessionId");

-- CreateIndex
CREATE INDEX "GalleryItem_userId_createdAt_idx" ON "GalleryItem"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GalleryItem_isPublic_createdAt_idx" ON "GalleryItem"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "GalleryLike_itemId_idx" ON "GalleryLike"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryLike_itemId_userId_key" ON "GalleryLike"("itemId", "userId");

-- CreateIndex
CREATE INDEX "GalleryComment_itemId_createdAt_idx" ON "GalleryComment"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow"("followerId");

-- CreateIndex
CREATE INDEX "UserFollow_followingId_idx" ON "UserFollow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "WebVisit_createdAt_idx" ON "WebVisit"("createdAt");

-- CreateIndex
CREATE INDEX "WebVisit_path_createdAt_idx" ON "WebVisit"("path", "createdAt");

-- CreateIndex
CREATE INDEX "WebVisit_sessionId_createdAt_idx" ON "WebVisit"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "WebVisit_userId_createdAt_idx" ON "WebVisit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoJob_userId_status_idx" ON "VideoJob"("userId", "status");

-- CreateIndex
CREATE INDEX "VideoJob_createdAt_idx" ON "VideoJob"("createdAt");

-- CreateIndex
CREATE INDEX "MediaIndustryReport_period_reportDate_idx" ON "MediaIndustryReport"("period", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "MediaIndustryReport_period_reportDate_key" ON "MediaIndustryReport"("period", "reportDate");

-- CreateIndex
CREATE INDEX "MediaNewsSource_reportDate_period_idx" ON "MediaNewsSource"("reportDate", "period");

-- CreateIndex
CREATE INDEX "MediaNewsSource_createdAt_idx" ON "MediaNewsSource"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaNewsSource_reportDate_period_url_key" ON "MediaNewsSource"("reportDate", "period", "url");

-- CreateIndex
CREATE INDEX "XAccountSnapshot_xAccountId_idx" ON "XAccountSnapshot"("xAccountId");

-- CreateIndex
CREATE INDEX "XAccountSnapshot_username_idx" ON "XAccountSnapshot"("username");

-- CreateIndex
CREATE INDEX "XTweetSnapshot_reportDate_period_idx" ON "XTweetSnapshot"("reportDate", "period");

-- CreateIndex
CREATE INDEX "XTweetSnapshot_xAccountId_idx" ON "XTweetSnapshot"("xAccountId");

-- CreateIndex
CREATE INDEX "XTweetSnapshot_username_createdAt_idx" ON "XTweetSnapshot"("username", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "XTweetSnapshot_reportDate_period_xAccountId_key" ON "XTweetSnapshot"("reportDate", "period", "xAccountId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_xAccountId_fkey" FOREIGN KEY ("xAccountId") REFERENCES "XAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_xAccountId_fkey" FOREIGN KEY ("xAccountId") REFERENCES "XAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeImage" ADD CONSTRAINT "KnowledgeImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeImage" ADD CONSTRAINT "KnowledgeImage_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XAccount" ADD CONSTRAINT "XAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryLike" ADD CONSTRAINT "GalleryLike_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GalleryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryLike" ADD CONSTRAINT "GalleryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryComment" ADD CONSTRAINT "GalleryComment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GalleryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryComment" ADD CONSTRAINT "GalleryComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebVisit" ADD CONSTRAINT "WebVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoJob" ADD CONSTRAINT "VideoJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
