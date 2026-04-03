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
          status: true, outputUrl: true, error: true, feeCents: true,
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
          status: true, outputUrl: true, error: true, feeCents: true,
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
          createdAt: true,
        },
      })
    : [];

  // Normalize gallery items to the same shape
  const galleryAsTasks = galleryItems.map((g) => ({
    id: g.id,
    type: g.type,
    modelLabel: g.modelLabel,
    prompt: g.prompt,
    mode: null,
    duration: null,
    aspectRatio: g.aspectRatio,
    generateAudio: false,
    status: "completed" as const,
    outputUrl: g.blobUrl,
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
