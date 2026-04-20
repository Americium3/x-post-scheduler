-- CreateTable
CREATE TABLE "MediaTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelLabel" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "duration" INTEGER,
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "generateAudio" BOOLEAN NOT NULL DEFAULT false,
    "lockCamera" BOOLEAN NOT NULL DEFAULT false,
    "inputImageUrl" TEXT,
    "provider" TEXT NOT NULL,
    "providerTaskId" TEXT,
    "providerPollUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "outputUrl" TEXT,
    "error" TEXT,
    "pollAttempts" INTEGER NOT NULL DEFAULT 0,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "byok" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MediaTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaTask_userId_status_idx" ON "MediaTask"("userId", "status");

-- CreateIndex
CREATE INDEX "MediaTask_status_createdAt_idx" ON "MediaTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MediaTask_createdAt_idx" ON "MediaTask"("createdAt");

-- AddForeignKey
ALTER TABLE "MediaTask" ADD CONSTRAINT "MediaTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
