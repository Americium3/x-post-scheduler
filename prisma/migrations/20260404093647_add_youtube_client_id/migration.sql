/*
  Warnings:

  - Added the required column `clientId` to the `YouTubeAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientSecret` to the `YouTubeAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "YouTubeAccount" ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "clientSecret" TEXT NOT NULL;
