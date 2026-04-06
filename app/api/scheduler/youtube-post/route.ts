import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectCronTrigger, logCronRun } from "@/lib/cron-logging";
import { updateVideoVisibility } from "@/lib/youtube-client";
import { decrypt, encrypt } from "@/lib/encryption";

async function processScheduledYouTubePosts() {
  const now = new Date();

  const duePosts = await prisma.post.findMany({
    where: {
      platform: "youtube",
      status: "scheduled",
      scheduledAt: { lte: now },
      userId: { not: null },
      youtubeAccountId: { not: null },
    },
    include: {
      youtubeAccount: true,
    },
  });

  console.log(`Found ${duePosts.length} YouTube posts to process`);

  const results = {
    total: duePosts.length,
    processed: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const post of duePosts) {
    console.log(`Processing YouTube post ${post.id}: ${post.videoTitle || post.content}`);

    if (!post.youtubeAccount) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "failed",
          error: "YouTube account not found",
        },
      });
      results.failed++;
      results.errors.push(`Post ${post.id}: YouTube account not found`);
      console.log(`Post ${post.id} failed: no YouTube account`);
      continue;
    }

    // Check if video was already uploaded (should have youtubeVideoId)
    if (!post.youtubeVideoId) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "failed",
          error: "Video not uploaded yet (missing youtubeVideoId)",
        },
      });
      results.failed++;
      results.errors.push(`Post ${post.id}: Video not uploaded yet`);
      console.log(`Post ${post.id} failed: no youtubeVideoId`);
      continue;
    }

    try {
      // Decrypt credentials
      const credentials = {
        clientId: decrypt(post.youtubeAccount.clientId),
        clientSecret: decrypt(post.youtubeAccount.clientSecret),
        refreshToken: decrypt(post.youtubeAccount.refreshToken),
        accessToken: post.youtubeAccount.accessToken
          ? decrypt(post.youtubeAccount.accessToken)
          : undefined,
        accessTokenExpiry: post.youtubeAccount.accessTokenExpiry || undefined,
      };

      // Update video visibility to target visibility
      const visibility = (post.videoVisibility || "public") as "public" | "private" | "unlisted";
      console.log(`[YouTubeScheduler] Updating video ${post.youtubeVideoId} visibility to ${visibility}`);
      
      const result = await updateVideoVisibility(
        post.youtubeVideoId,
        visibility,
        credentials
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to update video visibility");
      }

      // Update access token if it was refreshed
      if (result.newAccessToken && result.newExpiry && post.youtubeAccountId) {
        console.log(`[YouTubeScheduler] Updating refreshed access token for account ${post.youtubeAccountId}`);
        await prisma.youTubeAccount.update({
          where: { id: post.youtubeAccountId },
          data: {
            accessToken: encrypt(result.newAccessToken),
            accessTokenExpiry: result.newExpiry,
          },
        });
      }

      // Update post status
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "posted",
          postedAt: new Date(),
          error: null,
        },
      });

      results.processed++;
      console.log(`Post ${post.id} visibility updated successfully to ${visibility}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "failed",
          error: errorMessage,
        },
      });

      results.failed++;
      results.errors.push(`Post ${post.id}: ${errorMessage}`);
      console.error(`Failed to process YouTube post ${post.id}:`, error);
    }
  }

  return results;
}

async function handleRequest(request: NextRequest) {
  const startedAt = Date.now();
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      await logCronRun({
        jobName: "youtube-post-scheduler",
        endpoint: "/api/scheduler/youtube-post",
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
    const results = await processScheduledYouTubePosts();

    await logCronRun({
      jobName: "youtube-post-scheduler",
      endpoint: "/api/scheduler/youtube-post",
      method: request.method,
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      triggeredBy: detectCronTrigger(request),
      metadata: results,
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process scheduled YouTube posts";

    await logCronRun({
      jobName: "youtube-post-scheduler",
      endpoint: "/api/scheduler/youtube-post",
      method: request.method,
      success: false,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      triggeredBy: detectCronTrigger(request),
      error: errorMessage,
    });

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
