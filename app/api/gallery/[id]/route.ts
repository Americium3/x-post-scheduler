import { NextRequest, NextResponse } from "next/server";
import { isGuestSessionUser, requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { deleteGalleryItem } from "@/lib/gallery";
import { prisma } from "@/lib/db";
import { buildSignedBlobProxyUrl } from "@/lib/blob-proxy";

function resolveInputImageUrl(url: string | null, origin: string): string | null {
  if (!url) return null;
  // Legacy: expired proxy URL — extract raw blob URL and re-sign
  if (url.includes("/api/toolbox/blob-proxy")) {
    try {
      const parsed = new URL(url);
      const raw = parsed.searchParams.get("u");
      if (raw && raw.includes(".private.blob.vercel-storage.com")) {
        return buildSignedBlobProxyUrl(origin, raw, 3600);
      }
    } catch {
      // fall through
    }
    return url;
  }
  // Private blob URL → sign
  if (url.includes(".private.blob.vercel-storage.com")) {
    try {
      return buildSignedBlobProxyUrl(origin, url, 3600); // 1 hour TTL
    } catch {
      return url;
    }
  }
  return url;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.galleryItem.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, picture: true, subscriptionTier: true, subscriptionStatus: true } } },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const origin = request.nextUrl.origin;

  // Resolve endpoint for BytePluses-eligible models
  let endpointId: string | undefined;
  let endpointModel: string | undefined;
  const byteplusEligible = [
    "bytedance/seedance-v1.5-pro/text-to-video",
    "bytedance/seedance-v1.5-pro/image-to-video",
  ];
  if (byteplusEligible.includes(item.modelId) && process.env.BYTEPLUSES_API_KEY) {
    const { BYTEPLUSES_ENDPOINTS } = await import("@/lib/bytepluses");
    const ep = BYTEPLUSES_ENDPOINTS["seedance-1.5-pro"];
    endpointId = ep?.id;
    endpointModel = ep?.model;
  }

  const resolved = {
    ...item,
    inputImageUrl: resolveInputImageUrl(item.inputImageUrl, origin),
    endpointId,
    endpointModel,
  };

  if (item.isPublic) {
    return NextResponse.json({ item: resolved });
  }

  try {
    const user = await requireAuth();
    if (item.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ item: resolved });
  } catch {
    return unauthorizedResponse();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { isPublic } = await request.json() as { isPublic: boolean };
  const isGuest = await isGuestSessionUser();
  if (isGuest && !isPublic) {
    return NextResponse.json(
      { error: "Guest-generated content must stay public." },
      { status: 403 }
    );
  }

  const updated = await prisma.galleryItem.update({
    where: { id },
    data: { isPublic },
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  try {
    await deleteGalleryItem(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 400 }
    );
  }
}
