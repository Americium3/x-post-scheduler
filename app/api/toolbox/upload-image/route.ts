import { NextRequest, NextResponse } from "next/server";
import { put } from "@/lib/r2";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

function getExtensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return "bin";
  }
}

export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are supported" },
      { status: 400 },
    );
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      {
        error: `Image must be between 1 byte and ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`,
      },
      { status: 400 },
    );
  }

  const ext = getExtensionFromMime(file.type);
  const blobPath = `toolbox-inputs/${user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const uploaded = await put(blobPath, buffer, {
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ url: uploaded.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload image",
      },
      { status: 500 },
    );
  }
}
