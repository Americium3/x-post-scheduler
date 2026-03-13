-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelLabel" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "GalleryItem_userId_createdAt_idx" ON "GalleryItem"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GalleryItem_isPublic_createdAt_idx" ON "GalleryItem"("isPublic", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryLike_itemId_userId_key" ON "GalleryLike"("itemId", "userId");

-- CreateIndex
CREATE INDEX "GalleryLike_itemId_idx" ON "GalleryLike"("itemId");

-- CreateIndex
CREATE INDEX "GalleryLike_userId_idx" ON "GalleryLike"("userId");

-- CreateIndex
CREATE INDEX "GalleryComment_itemId_createdAt_idx" ON "GalleryComment"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "GalleryComment_userId_idx" ON "GalleryComment"("userId");

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
