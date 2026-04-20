import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth0";
import { VIDEO_MODELS, I2V_MODELS, isPremiumModel } from "@/lib/wavespeed";
import { SEEDANCE_VIDEO_MODELS, SEEDANCE_I2V_MODELS } from "@/lib/seedance";
import { BYTEPLUS_I2V_MODELS } from "@/lib/bytepluses";
import { submitVideo, detectVideoProvider } from "@/lib/video-provider";
import { trackWavespeedUsage } from "@/lib/usage-tracking";
import {
  deductWavespeedCredits,
  getCreditBalance,
  getWavespeedFeeCents,
  getOrCreateTrialUser,
  isDailyTrialCapReached,
} from "@/lib/credits";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : cfConnectingIp || "unknown";
  return ip;
}

export async function POST(request: NextRequest) {
  // Try to authenticate; if fails, use trial user
  let user: Awaited<ReturnType<typeof getAuthenticatedUser>> | null = null;
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const authenticatedUser = await getAuthenticatedUser();
    if (authenticatedUser) {
      user = authenticatedUser;
    }
  } catch {
    // Not authenticated
  }

  // If not authenticated, use trial user
  if (!user) {
    if (await isDailyTrialCapReached()) {
      return NextResponse.json(
        {
          error: "Daily trial limit reached. Sign up for a free account to continue!",
          trialMessage: "The platform's daily trial quota has been reached. Sign up to get $5 free credits!",
        },
        { status: 402 },
      );
    }
    const trialUserId = await getOrCreateTrialUser(clientIp, userAgent);
    user = {
      id: trialUserId,
      auth0Sub: "trial",
      email: null,
      name: "Trial User",
      picture: null,
      language: "en",
      weixinCookie: null,
    };
  }

  const body = await request.json();
  const { modelId, prompt, duration, aspectRatio, imageUrl, generateAudio, lockCamera } =
    body as {
      modelId: string;
      prompt: string;
      duration?: number;
      aspectRatio?: string;
      imageUrl?: string;
      generateAudio?: boolean;
      lockCamera?: boolean;
    };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const allVideoModels = [...VIDEO_MODELS, ...I2V_MODELS, ...SEEDANCE_VIDEO_MODELS, ...SEEDANCE_I2V_MODELS, ...BYTEPLUS_I2V_MODELS];
  const validModel = allVideoModels.find((m) => m.id === modelId);
  if (!validModel) {
    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  }

  // Premium model restriction: members only
  if (isPremiumModel(modelId) && !user.id.startsWith("trial-")) {
    const membership = await prisma.user.findUnique({
      where: { id: user.id },
      select: { subscriptionTier: true, subscriptionStatus: true },
    });
    const { isVerifiedMember } = await import("@/lib/subscription");
    if (!isVerifiedMember(membership?.subscriptionTier, membership?.subscriptionStatus)) {
      return NextResponse.json(
        { error: "Premium models require an active membership. Please subscribe to access this model." },
        { status: 403 },
      );
    }
  }

  // Check for BYOK Seedance key
  let userSeedanceKey: string | null = null;
  const isSeedanceModel = detectVideoProvider(modelId) === "seedance";
  if (isSeedanceModel && !user.id.startsWith("trial-")) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { seedanceApiKey: true },
      });
      if (dbUser?.seedanceApiKey) {
        userSeedanceKey = decrypt(dbUser.seedanceApiKey);
      }
    } catch (e) {
      console.error("Failed to fetch BYOK key:", e);
    }
  }

  const useBYOK = isSeedanceModel && !!userSeedanceKey;

  // Skip credit check if using BYOK
  if (!useBYOK) {
    const feeCents = getWavespeedFeeCents(modelId, "video");
    const balanceCents = await getCreditBalance(user.id);
    if (balanceCents < feeCents) {
      const isTrialUser = user.id.startsWith("trial-");
      return NextResponse.json(
        {
          error: `Insufficient credits. Need $${(feeCents / 100).toFixed(2)} to generate this video.`,
          ...(isTrialUser && {
            trialMessage:
              "You've used your daily $1 trial credit. Sign up for a free account to unlock more credits!",
          }),
        },
        { status: 402 },
      );
    }
  }

  // Enhance prompt for Chinese text preservation in I2V when input image may contain Chinese
  let finalPrompt = prompt;
  const hasChinese = /[\u4e00-\u9fff]/.test(prompt);
  if (imageUrl && (hasChinese || /[\u4e00-\u9fff]/.test(imageUrl))) {
    // If the prompt itself is in Chinese, add a hint to preserve text in the image
    if (hasChinese && !prompt.includes("preserve") && !prompt.includes("保持")) {
      finalPrompt = `${prompt}. Preserve all Chinese text/characters visible in the image accurately.`;
    }
  } else if (hasChinese) {
    // T2V with Chinese prompt — hint to render Chinese text correctly
    if (!prompt.includes("Chinese") && !prompt.includes("中文")) {
      finalPrompt = `${prompt}. Render any Chinese text/characters clearly and accurately.`;
    }
  }

  const provider = detectVideoProvider(modelId);

  try {
    const task = await submitVideo(
      { modelId, prompt: finalPrompt, duration, aspectRatio, imageUrl, generateAudio, lockCamera },
      useBYOK ? { userSeedanceKey: userSeedanceKey! } : undefined,
    );

    // Skip credit deduction if using BYOK
    if (!useBYOK) {
      try {
        await deductWavespeedCredits({
          userId: user.id,
          modelId,
          mediaType: "video",
          source: "toolbox_video_generate",
          taskId: task.id,
        });
      } catch (creditError) {
        if (
          creditError instanceof Error &&
          creditError.message === "INSUFFICIENT_CREDITS"
        ) {
          const isTrialUser = user.id.startsWith("trial-");
          return NextResponse.json(
            {
              error: `Insufficient credits. Need $${(getWavespeedFeeCents(modelId, "video") / 100).toFixed(2)} to generate this video.`,
              ...(isTrialUser && {
                trialMessage:
                  "You've used your daily $1 trial credit. Sign up for a free account to unlock more credits!",
              }),
            },
            { status: 402 },
          );
        }
        console.error("Failed to deduct video credits:", creditError);
      }
    }

    // Save as background MediaTask for cron-based polling
    try {
      await prisma.mediaTask.create({
        data: {
          userId: user.id,
          type: "video",
          modelId,
          modelLabel: validModel.label,
          prompt: finalPrompt,
          mode: imageUrl ? "i2v" : "t2v",
          duration: duration ?? 5,
          aspectRatio: aspectRatio ?? "16:9",
          generateAudio: generateAudio ?? false,
          lockCamera: lockCamera ?? false,
          inputImageUrl: imageUrl ?? null,
          provider,
          providerTaskId: task.id,
          providerPollUrl: task.outputs?.[0] ?? null,
          status: "processing",
          feeCents: useBYOK ? 0 : getWavespeedFeeCents(modelId, "video"),
          byok: useBYOK,
        },
      });
    } catch (dbErr) {
      console.error("Failed to create MediaTask:", dbErr);
    }

    try {
      await trackWavespeedUsage({
        userId: user.id,
        source: "toolbox_video_generate",
        model: modelId,
        prompt,
        metadata: {
          duration: duration ?? 5,
          aspectRatio: aspectRatio ?? "16:9",
          byok: useBYOK,
        },
      });
    } catch (usageError) {
      console.error("Failed to track video usage:", usageError);
    }
    const remainingCents = await getCreditBalance(user.id);
    return NextResponse.json({ task, remainingCents, byok: useBYOK });
  } catch (error) {
    console.error("Video submit error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to submit task",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  try {
    const provider = taskId.includes("seedance") ? "seedance" : "wavespeed";
    const { pollVideo } = await import("@/lib/video-provider");
    const task = await pollVideo(taskId, provider);
    return NextResponse.json({ task });
  } catch (error) {
    console.error("Video poll error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to poll task" },
      { status: 500 }
    );
  }
}
