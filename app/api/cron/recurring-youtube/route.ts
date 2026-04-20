import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectCronTrigger, logCronRun } from "@/lib/cron-logging";
import { fetchTrendingTopics } from "@/lib/trending";
import { submitVideo, pollVideo } from "@/lib/video-provider";
import { uploadVideo } from "@/lib/youtube-client";
import { decrypt, encrypt } from "@/lib/encryption";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Trend {
  name: string;
  url?: string;
  description?: string;
}

interface TrendSummary {
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  highlightsEn: string[];
  highlightsZh: string[];
}

async function generateTrendSummary(trends: Trend[]): Promise<TrendSummary | null> {
  if (!process.env.GEMINI_API_KEY || trends.length === 0) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7
      },
    });
    
    const condensedTrends = trends.map((trend, index) => ({
      index: index + 1,
      name: trend.name,
      description: trend.description || "",
    }));

    const prompt = `You are a senior content strategist analyzing trending topics. Create a bilingual summary of these trending topics for video content creation.

Return JSON matching this exact schema:
{
  "titleEn": string,
  "titleZh": string,
  "summaryEn": string,
  "summaryZh": string,
  "highlightsEn": string[],
  "highlightsZh": string[]
}

TITLE RULES:
- The title MUST combine 2-3 DIFFERENT trending topics — pick the most interesting that contrast or complement each other.
- FORBIDDEN words: "developments", "updates", "insights", "roundup", "wrap", "trending topics"
- WRONG (generic): "Trending Topics: AI and Politics"
- RIGHT (specific): "AI Breakthrough Meets Political Debate; Tech Giants Respond"
- titleZh should follow the same multi-topic structure, using "；" as separator.

CONTENT RULES:
- summaryEn and summaryZh: 2–3 sentences summarizing the key themes and why they matter
- highlightsEn and highlightsZh: exactly 3-5 bullets each
  - Each bullet should be actionable or insightful
  - Focus on what makes each trend significant
- Professional, engaging tone suitable for video content

Trending Topics:
${JSON.stringify(condensedTrends, null, 2)}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<TrendSummary>;
    
    if (!parsed.titleEn || !parsed.summaryEn || !parsed.titleZh || !parsed.summaryZh) {
      return null;
    }

    return {
      titleEn: parsed.titleEn.trim(),
      titleZh: parsed.titleZh.trim(),
      summaryEn: parsed.summaryEn.trim(),
      summaryZh: parsed.summaryZh.trim(),
      highlightsEn: (parsed.highlightsEn ?? [])
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
        .slice(0, 5),
      highlightsZh: (parsed.highlightsZh ?? [])
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
        .slice(0, 5),
    };
  } catch (error) {
    console.error("Failed to generate trend summary:", error);
    return null;
  }
}

async function handleRequest(request: NextRequest) {
  const startedAt = Date.now();
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      await logCronRun({
        jobName: "recurring-youtube",
        endpoint: "/api/cron/recurring-youtube",
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
    const schedules = await prisma.recurringYoutubeSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        user: true,
        youtubeAccount: true,
      },
    });

    const results = {
      total: schedules.length,
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const schedule of schedules) {
      try {
        if (!schedule.userId || !schedule.youtubeAccountId || !schedule.youtubeAccount) {
          throw new Error("Missing user or YouTube account");
        }

        // 1. Fetch trending news
        const woeids: Record<string, number> = {
          global: 1,
          usa: 23424977,
          china: 23424856,
          africa: 23424908,
        };
        const woeid = woeids[schedule.trendRegion || "global"] || 1;
        const trendResult = await fetchTrendingTopics(schedule.userId, woeid);

        if (!trendResult.success || !trendResult.trends || trendResult.trends.length === 0) {
          throw new Error("Failed to fetch trends");
        }

        // 2. Generate summary with Gemini
        const randomTrends = trendResult.trends
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        
        const summary = await generateTrendSummary(randomTrends);
        const language = schedule.aiLanguage || "en";
        const userPrompt = schedule.aiPrompt || "";
        
        

        let videoPrompt: string;
        if (summary) {
          const title = language === "zh" ? summary.titleZh : summary.titleEn;
          const summaryText = language === "zh" ? summary.summaryZh : summary.summaryEn;
          videoPrompt = userPrompt 
            ? `${userPrompt}\n\n${title}: ${summaryText}`.slice(0, 200)
            : `${title}: ${summaryText}`.slice(0, 200);
        } else {
          const trendsText = randomTrends.map(t => t.name).join(", ");
          videoPrompt = userPrompt 
            ? `${userPrompt}\n\nTrending: ${trendsText}`.slice(0, 200)
            : `Create a video about: ${trendsText}`.slice(0, 200);
        }

        // 3. Generate video
        console.log(`[RecurringYT] Submitting video for schedule ${schedule.id}`);
        console.log(`[RecurringYT] Model: ${schedule.model || "wavespeed-ai/wan-2.2/t2v-480p-ultra-fast"}`);
        console.log(`[RecurringYT] Prompt: ${videoPrompt}`);
        
        const videoTask = await submitVideo({
          modelId: schedule.model || "wavespeed-ai/wan-2.2/t2v-480p-ultra-fast",
          prompt: videoPrompt,
          duration: schedule.duration || 5,
          aspectRatio: schedule.aspectRatio || "16:9",
        });

        console.log(`[RecurringYT] Video task submitted: ${videoTask.id}`);

        // 4. Poll until complete with extended timeout and better error handling
        const pollUrl = videoTask.urls?.get || videoTask.id;
        const provider = videoTask.id.includes("seedance") ? "seedance" : "wavespeed";
        let videoResult = await pollVideo(pollUrl, provider);
        let attempts = 0;
        const maxAttempts = 120; // 20 minutes (120 * 10s)
        const pollInterval = 10000; // 10 seconds
        
        console.log(`[RecurringYT] Starting to poll video status (max ${maxAttempts} attempts)`);
        console.log(`[RecurringYT] Initial status: ${videoResult.status}`);
        
        // Poll while status is not completed or failed (includes "created" and "processing")
        while (videoResult.status !== "completed" && videoResult.status !== "failed" && attempts < maxAttempts) {
          attempts++;
          if (attempts % 6 === 0) { // Log every minute
            console.log(`[RecurringYT] Still processing... (${attempts}/${maxAttempts} attempts, ${Math.floor(attempts * pollInterval / 60000)} minutes, status: ${videoResult.status})`);
          }
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          try {
            videoResult = await pollVideo(pollUrl, provider);
          } catch (pollError) {
            // Handle transient polling errors - continue polling unless we've exceeded max attempts
            console.warn(`[RecurringYT] Polling error (attempt ${attempts}): ${pollError instanceof Error ? pollError.message : String(pollError)}`);
            if (attempts >= maxAttempts) {
              throw new Error(`Failed to poll video status after ${maxAttempts} attempts: ${pollError instanceof Error ? pollError.message : String(pollError)}`);
            }
            // Continue polling on transient errors
            continue;
          }
        }

        console.log(`[RecurringYT] Final video status: ${videoResult.status} after ${attempts} attempts`);

        if (videoResult.status === "failed") {
          const errorMsg = videoResult.error || "Video generation failed";
          console.error(`[RecurringYT] Video generation failed: ${errorMsg}`);
          throw new Error(`Video generation failed: ${errorMsg}`);
        }

        if (videoResult.status !== "completed") {
          console.error(`[RecurringYT] Video generation timed out after ${maxAttempts} attempts (${maxAttempts * pollInterval / 60000} minutes). Final status: ${videoResult.status}`);
          throw new Error(`Video generation timed out after ${maxAttempts * pollInterval / 60000} minutes. Status: ${videoResult.status}, Task ID: ${videoTask.id}`);
        }

        if (!videoResult.outputs?.[0]) {
          console.error(`[RecurringYT] Video completed but no output URL found. Status: ${videoResult.status}, outputs: ${JSON.stringify(videoResult.outputs)}`);
          throw new Error(`Video generation completed but no output URL was returned. Task ID: ${videoTask.id}`);
        }

        const videoUrl = videoResult.outputs[0];
        console.log(`[RecurringYT] Video generated successfully: ${videoUrl}`);

        // 5. Save to gallery
        await prisma.galleryItem.create({
          data: {
            userId: schedule.userId,
            type: "video",
            modelId: schedule.model || "kling-v1",
            modelLabel: schedule.model || "kling-v1",
            prompt: videoPrompt,
            blobUrl: videoUrl,
            sourceUrl: videoUrl,
            aspectRatio: schedule.aspectRatio || "16:9",
          },
        });

        // 6. Upload to YouTube
        const credentials = {
          clientId: decrypt(schedule.youtubeAccount.clientId),
          clientSecret: decrypt(schedule.youtubeAccount.clientSecret),
          refreshToken: decrypt(schedule.youtubeAccount.refreshToken),
          accessToken: schedule.youtubeAccount.accessToken ? decrypt(schedule.youtubeAccount.accessToken) : undefined,
          accessTokenExpiry: schedule.youtubeAccount.accessTokenExpiry || undefined,
        };

        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) throw new Error("Failed to fetch video");
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

        const trendsForDescription = randomTrends.map(t => t.name).join(", ");
        const uploadResult = await uploadVideo(
          videoBuffer,
          videoPrompt.slice(0, 100),
          `${videoPrompt}\n\nBased on trending: ${trendsForDescription.slice(0, 200)}`,
          "public",
          credentials
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "YouTube upload failed");
        }

        // Update access token if it was refreshed
        if (uploadResult.newAccessToken && uploadResult.newExpiry) {
          console.log(`[RecurringYT] Updating refreshed access token for account ${schedule.youtubeAccountId}`);
          await prisma.youTubeAccount.update({
            where: { id: schedule.youtubeAccountId },
            data: {
              accessToken: encrypt(uploadResult.newAccessToken),
              accessTokenExpiry: uploadResult.newExpiry,
            },
          });
        }

        // 7. Update nextRunAt based on frequency
        const nextRun = new Date(now);
        if (schedule.frequency === "daily") {
          nextRun.setDate(nextRun.getDate() + 1);
        } else if (schedule.frequency === "weekly") {
          nextRun.setDate(nextRun.getDate() + 7);
        } else if (schedule.frequency === "monthly") {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }

        await prisma.recurringYoutubeSchedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: nextRun },
        });

        console.log(`[RecurringYT] Updated schedule ${schedule.id}: nextRunAt set to ${nextRun.toISOString()} (frequency: ${schedule.frequency})`);

        results.processed++;
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Schedule ${schedule.id}: ${errorMessage}`);
        console.error(`Failed to process schedule ${schedule.id}:`, error);
      }
    }

    await logCronRun({
      jobName: "recurring-youtube",
      endpoint: "/api/cron/recurring-youtube",
      method: request.method,
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      triggeredBy: detectCronTrigger(request),
      metadata: results,
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process recurring YouTube schedules";

    await logCronRun({
      jobName: "recurring-youtube",
      endpoint: "/api/cron/recurring-youtube",
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
