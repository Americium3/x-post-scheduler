import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";

/** Strip provider prefix from model ID: "wavespeed-ai/wan-2.2/i2v" → "wan-2.2/i2v" */
function stripProviderPrefix(modelId: string): string {
  const providerPrefixes = ["wavespeed-ai/", "bytedance/", "alibaba/", "kwaivgi/", "byteplus/", "openrouter/"];
  for (const prefix of providerPrefixes) {
    if (modelId.startsWith(prefix)) return modelId.slice(prefix.length);
  }
  return modelId;
}

/** Strip internal fields from generationMeta */
function cleanMeta(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const { provider, pollUrl, taskId, backgroundTask, syncMode, byok, ...visible } = parsed;
      return Object.keys(visible).length > 0 ? visible : null;
    }
    return null;
  } catch { return null; }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await getAuthenticatedUser();
    if (!user) throw new Error("Not authenticated");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Try MediaTask first
  const task = await prisma.mediaTask.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true, type: true, modelId: true, modelLabel: true, prompt: true,
      mode: true, duration: true, aspectRatio: true, generateAudio: true,
      lockCamera: true, inputImageUrl: true, provider: true,
      status: true, outputUrl: true, error: true, feeCents: true,
      pollAttempts: true, createdAt: true, completedAt: true,
    },
  });

  if (task) {
    // Resolve endpoint info for BytePluses
    let endpointId: string | undefined;
    let endpointModel: string | undefined;
    if (task.provider === "byteplus") {
      const { BYTEPLUSES_ENDPOINTS } = await import("@/lib/bytepluses");
      const ep = BYTEPLUSES_ENDPOINTS["seedance-1.5-pro"];
      endpointId = ep?.id;
      endpointModel = ep?.model;
    }
    return NextResponse.json({
      item: {
        ...task,
        modelId: stripProviderPrefix(task.modelId),
        endpointId,
        endpointModel,
        provider: undefined, // don't expose provider name
        source: "task",
      },
    });
  }

  // Try GalleryItem
  const gallery = await prisma.galleryItem.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true, type: true, modelId: true, modelLabel: true, prompt: true,
      blobUrl: true, sourceUrl: true, inputImageUrl: true,
      generationMeta: true, aspectRatio: true, mimeType: true,
      isPublic: true, createdAt: true,
    },
  });

  if (gallery) {
    const meta = cleanMeta(gallery.generationMeta);

    // Resolve endpoint for BytePluses-eligible models
    let endpointId: string | undefined;
    let endpointModel: string | undefined;
    const byteplusEligible = [
      "bytedance/seedance-v1.5-pro/text-to-video",
      "bytedance/seedance-v1.5-pro/image-to-video",
    ];
    if (byteplusEligible.includes(gallery.modelId) && process.env.BYTEPLUSES_API_KEY) {
      const { BYTEPLUSES_ENDPOINTS } = await import("@/lib/bytepluses");
      const ep = BYTEPLUSES_ENDPOINTS["seedance-1.5-pro"];
      endpointId = ep?.id;
      endpointModel = ep?.model;
    }

    return NextResponse.json({
      item: {
        id: gallery.id,
        type: gallery.type,
        modelId: stripProviderPrefix(gallery.modelId),
        modelLabel: gallery.modelLabel,
        prompt: gallery.prompt,
        mode: (meta?.mode as string) ?? null,
        duration: (meta?.duration as number) ?? null,
        aspectRatio: gallery.aspectRatio,
        generateAudio: !!(meta?.generateAudio),
        lockCamera: !!(meta?.lockCamera),
        inputImageUrl: gallery.inputImageUrl,
        status: "completed",
        outputUrl: gallery.blobUrl,
        endpointId,
        endpointModel,
        error: null,
        feeCents: 0,
        isPublic: gallery.isPublic,
        mimeType: gallery.mimeType,
        createdAt: gallery.createdAt,
        completedAt: gallery.createdAt,
        source: "gallery",
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
