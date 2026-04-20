-- CreateTable
CREATE TABLE "RecurringYoutubeSchedule" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "useAi" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiLanguage" TEXT,
    "aspectRatio" TEXT,
    "duration" INTEGER,
    "model" TEXT,
    "frequency" TEXT NOT NULL,
    "cronExpr" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "youtubeAccountId" TEXT,

    CONSTRAINT "RecurringYoutubeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringYoutubeSchedule_isActive_nextRunAt_idx" ON "RecurringYoutubeSchedule"("isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringYoutubeSchedule_userId_isActive_idx" ON "RecurringYoutubeSchedule"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "RecurringYoutubeSchedule" ADD CONSTRAINT "RecurringYoutubeSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringYoutubeSchedule" ADD CONSTRAINT "RecurringYoutubeSchedule_youtubeAccountId_fkey" FOREIGN KEY ("youtubeAccountId") REFERENCES "YouTubeAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
