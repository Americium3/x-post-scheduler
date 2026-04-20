import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectCronTrigger, logCronRun } from "@/lib/cron-logging";
import { postTweet, postTweetWithMedia, getTweetWithMedia } from "@/lib/x-client";
import { uploadVideo } from "@/lib/youtube-client";
import { getUserXCredentials } from "@/lib/user-credentials";
import { decrypt } from "@/lib/encryption";

async function handleRequest(request: NextRequest) {
  const startedAt = Date.now();
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      await logCronRun({
        jobName: "publish-scheduled",
        endpoint: "/api/cron/publish-scheduled",
        method: request.method,
        success: false,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
        triggeredBy: detectCronTrigger(request),
        error: "Unauthorized",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();

    // Find all scheduled posts that are due
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        xAccount: true,
        youtubeAccount: true,
      },
    });

    const results = {
      total: scheduledPosts.length,
      published: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const post of scheduledPosts) {
      try {
        // Handle X (Twitter) posts
        if (post.xAccountId && post.xAccount) {
          if (!post.userId) {
            throw new Error("User ID not found");
          }
          const resolved = await getUserXCredentials(post.userId, post.xAccountId);
          if (!resolved) {
            throw new Error("X API credentials not found");
          }

          let result;
          const mediaUrls = post.mediaUrls ? JSON.parse(post.mediaUrls) : [];
          const mediaUrl = mediaUrls[0];

          if (mediaUrl) {
            const mediaRes = await fetch(mediaUrl);
            if (!mediaRes.ok) {
              throw new Error("Failed to fetch media");
            }
            const buffer = Buffer.from(await mediaRes.arrayBuffer());
            const mimeType = (mediaRes.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
            result = await postTweetWithMedia(post.content, buffer, mimeType, resolved.credentials);
          } else {
            result = await postTweet(post.content, resolved.credentials);
          }

          let finalMediaUrls = mediaUrl ? JSON.stringify([mediaUrl]) : null;
          if (result.success && result.tweetId && mediaUrl) {
            try {
              const tweetMedia = await getTweetWithMedia(result.tweetId, resolved.credentials);
              if (tweetMedia.mediaUrls.length > 0) {
                finalMediaUrls = JSON.stringify(tweetMedia.mediaUrls);
              }
            } catch {
              // Non-critical
            }
          }

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: result.success ? "posted" : "failed",
              postedAt: result.success ? new Date() : null,
              tweetId: result.tweetId || null,
              error: result.error || null,
              mediaUrls: finalMediaUrls,
            },
          });

          if (result.success) {
            results.published++;
          } else {
            results.failed++;
            results.errors.push(`Post ${post.id}: ${result.error}`);
          }
        }

        // Handle YouTube posts
        else if (post.youtubeAccountId && post.youtubeAccount) {
          const youtubeAccount = post.youtubeAccount;
          const credentials = {
            clientId: decrypt(youtubeAccount.clientId),
            clientSecret: decrypt(youtubeAccount.clientSecret),
            refreshToken: decrypt(youtubeAccount.refreshToken),
            accessToken: youtubeAccount.accessToken ? decrypt(youtubeAccount.accessToken) : undefined,
            accessTokenExpiry: youtubeAccount.accessTokenExpiry || undefined,
          };

          const mediaUrls = post.mediaUrls ? JSON.parse(post.mediaUrls) : [];
          const videoUrl = mediaUrls[0];

          if (!videoUrl) {
            throw new Error("Video URL not found");
          }

          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            throw new Error("Failed to fetch video file");
          }

          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

          const result = await uploadVideo(
            videoBuffer,
            post.videoTitle || post.content,
            post.videoDescription || post.content,
            ((post.videoVisibility || "public") as "public" | "private" | "unlisted"),
            credentials
          );

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: result.success ? "posted" : "failed",
              postedAt: result.success ? new Date() : null,
              youtubeVideoId: result.videoId || null,
              error: result.error || null,
              mediaUrls: null,
            },
          });

          if (result.success) {
            results.published++;
          } else {
            results.failed++;
            results.errors.push(`Post ${post.id}: ${result.error}`);
          }
        }
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Post ${post.id}: ${errorMessage}`);

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "failed",
            error: errorMessage,
          },
        });
      }
    }

    await logCronRun({
      jobName: "publish-scheduled",
      endpoint: "/api/cron/publish-scheduled",
      method: request.method,
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      triggeredBy: detectCronTrigger(request),
      metadata: results,
    });

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to publish scheduled posts";

    await logCronRun({
      jobName: "publish-scheduled",
      endpoint: "/api/cron/publish-scheduled",
      method: request.method,
      success: false,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      triggeredBy: detectCronTrigger(request),
      error: errorMessage,
    });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
