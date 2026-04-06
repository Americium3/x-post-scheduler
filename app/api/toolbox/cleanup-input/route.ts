import { NextRequest, NextResponse } from "next/server";
import { del } from "@/lib/r2";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { prisma } from "@/lib/db";

function extractBlobUrl(inputUrl: string): string | null {
  try {
    const parsed = new URL(inputUrl);
    // Support signed proxy URLs
    if (parsed.pathname === "/api/toolbox/blob-proxy") {
      const raw = parsed.searchParams.get("u");
      if (!raw) return null;
      return decodeURIComponent(raw);
    }
    // Accept both legacy Vercel Blob URLs and R2 URLs
    const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";
    if (
      parsed.hostname.endsWith(".blob.vercel-storage.com") ||
      (r2PublicUrl && inputUrl.startsWith(r2PublicUrl))
    ) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => ({}))) as { inputUrl?: string };
  const inputUrl = body.inputUrl?.trim();
  if (!inputUrl) {
    return NextResponse.json({ ok: true, deleted: false, reason: "missing_input_url" });
  }

  const blobUrl = extractBlobUrl(inputUrl);
  if (!blobUrl) {
    return NextResponse.json({ ok: true, deleted: false, reason: "not_blob_url" });
  }

  // Don't delete if referenced by a gallery item or media task
  try {
    const [galleryRef, taskRef] = await Promise.all([
      prisma.galleryItem.findFirst({ where: { inputImageUrl: blobUrl }, select: { id: true } }),
      prisma.mediaTask.findFirst({ where: { inputImageUrl: blobUrl }, select: { id: true } }),
    ]);
    if (galleryRef || taskRef) {
      return NextResponse.json({ ok: true, deleted: false, reason: "referenced_by_gallery" });
    }
  } catch {
    // If DB check fails, skip deletion to be safe
    return NextResponse.json({ ok: true, deleted: false, reason: "db_check_failed" });
  }

  try {
    await del(blobUrl);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, deleted: false, error: error instanceof Error ? error.message : "Failed to delete blob" },
      { status: 500 }
    );
  }
}

