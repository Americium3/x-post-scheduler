import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";

/**
 * GET /api/toolbox/tasks — list user's materials (gallery items + pending tasks)
 * Query params: status (optional: "all"|"processing"|"completed"|"failed"), limit (default 50)
 */
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getAuthenticatedUser();
    if (!user) throw new Error("Not authenticated");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusFilter = request.nextUrl.searchParams.get("status") ?? "all";
  const limit = Math.min(100, Number(request.nextUrl.searchParams.get("limit") ?? 50));

  // Pending/processing tasks from MediaTask
  const pendingTasks = statusFilter === "all" || statusFilter === "processing"
    ? await prisma.mediaTask.findMany({
        where: { userId: user.id, status: { in: ["pending", "processing"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, type: true, modelLabel: true, prompt: true,
          mode: true, duration: true, aspectRatio: true, generateAudio: true,
          status: true, outputUrl: true, inputImageUrl: true, error: true, feeCents: true,
          pollAttempts: true,
          createdAt: true, completedAt: true,
        },
      })
    : [];

  // Failed tasks from MediaTask
  const failedTasks = statusFilter === "all" || statusFilter === "failed"
    ? await prisma.mediaTask.findMany({
        where: { userId: user.id, status: "failed" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, type: true, modelLabel: true, prompt: true,
          mode: true, duration: true, aspectRatio: true, generateAudio: true,
          status: true, outputUrl: true, inputImageUrl: true, error: true, feeCents: true,
          pollAttempts: true,
          createdAt: true, completedAt: true,
        },
      })
    : [];

  // Completed items from GalleryItem (the main content library)
  const galleryItems = statusFilter === "all" || statusFilter === "completed"
    ? await prisma.galleryItem.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true, type: true, modelLabel: true, prompt: true,
          blobUrl: true, aspectRatio: true, mimeType: true, isPublic: true,
          inputImageUrl: true, generationMeta: true,
          createdAt: true,
        },
      })
    : [];

  // Strip internal fields from generationMeta
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

  // Normalize gallery items to the same shape
  const galleryAsTasks = galleryItems.map((g) => ({
    id: g.id,
    type: g.type,
    modelLabel: g.modelLabel,
    prompt: g.prompt,
    mode: cleanMeta(g.generationMeta)?.mode as string | null ?? null,
    duration: cleanMeta(g.generationMeta)?.duration as number | null ?? null,
    aspectRatio: g.aspectRatio,
    generateAudio: !!(cleanMeta(g.generationMeta)?.generateAudio),
    status: "completed" as const,
    outputUrl: g.blobUrl,
    inputImageUrl: g.inputImageUrl,
    error: null,
    feeCents: 0,
    createdAt: g.createdAt,
    completedAt: g.createdAt,
    isPublic: g.isPublic,
    source: "gallery" as const,
  }));

  const taskItems = [...pendingTasks, ...failedTasks].map((t) => ({
    ...t,
    isPublic: false,
    source: "task" as const,
  }));

  // Merge and sort by createdAt desc
  const all = [...taskItems, ...galleryAsTasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return NextResponse.json({ tasks: all });
}
