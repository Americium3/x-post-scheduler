import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { uploadVideo } from "@/lib/youtube-client";
import { decrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const contentType = request.headers.get("content-type") || "";
  
  // Handle multipart/form-data (direct file upload)
  if (contentType.includes("multipart/form-data")) {
    return handleFileUpload(request, user);
  }

  // Handle JSON (URL-based upload)
  const body = await request.json();
  const {
    title,
    description,
    visibility,
    videoUrl,
    postImmediately,
    scheduledAt,
    youtubeAccountId,
  } = body;

  if (!title || title.length === 0) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  if (!videoUrl) {
    return NextResponse.json(
      { error: "Video is required" },
      { status: 400 }
    );
  }

  if (!youtubeAccountId) {
    return NextResponse.json(
      { error: "YouTube account is required" },
      { status: 400 }
    );
  }

  // Verify the YouTube account belongs to the user
  const youtubeAccount = await prisma.youTubeAccount.findFirst({
    where: {
      id: youtubeAccountId,
      userId: user.id,
    },
  });

  if (!youtubeAccount) {
    return NextResponse.json(
      { error: "YouTube account not found" },
      { status: 404 }
    );
  }

  if (postImmediately) {
    // Upload video to YouTube immediately
    try {
      // Fetch the video file from the URL
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch video file" },
          { status: 400 }
        );
      }

      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

      // Decrypt credentials
      const credentials = {
        clientId: decrypt(youtubeAccount.clientId),
        clientSecret: decrypt(youtubeAccount.clientSecret),
        refreshToken: decrypt(youtubeAccount.refreshToken),
        accessToken: youtubeAccount.accessToken ? decrypt(youtubeAccount.accessToken) : undefined,
        accessTokenExpiry: youtubeAccount.accessTokenExpiry || undefined,
      };

      const result = await uploadVideo(
        videoBuffer,
        title,
        description || "",
        visibility || "public",
        credentials
      );

      if (!result.success) {
        const post = await prisma.post.create({
          data: {
            content: title,
            platform: "youtube",
            videoTitle: title,
            videoDescription: description || "",
            videoVisibility: visibility || "public",
            mediaUrls: JSON.stringify([videoUrl]),
            status: "failed",
            error: result.error || "Failed to upload video",
            youtubeAccountId: youtubeAccount.id,
            userId: user.id,
          },
        });

        return NextResponse.json(
          { error: result.error || "Failed to upload video", post },
          { status: 500 }
        );
      }

      const post = await prisma.post.create({
        data: {
          content: title,
          platform: "youtube",
          videoTitle: title,
          videoDescription: description || "",
          videoVisibility: visibility || "public",
          mediaUrls: null,
          status: "posted",
          postedAt: new Date(),
          youtubeVideoId: result.videoId,
          youtubeAccountId: youtubeAccount.id,
          userId: user.id,
        },
      });

      return NextResponse.json(post);
    } catch (error) {
      console.error("YouTube post creation error:", error);
      return NextResponse.json(
        { error: "Failed to create YouTube post" },
        { status: 500 }
      );
    }
  }

  // Schedule for later - only save to database, don't call YouTube API
  const post = await prisma.post.create({
    data: {
      content: title,
      platform: "youtube",
      videoTitle: title,
      videoDescription: description || "",
      videoVisibility: visibility || "public",
      mediaUrls: JSON.stringify([videoUrl]),
      status: "scheduled",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      youtubeAccountId: youtubeAccount.id,
      userId: user.id,
    },
  });

  return NextResponse.json(post);
}

// Handle direct file upload (multipart/form-data)
async function handleFileUpload(request: NextRequest, user: { id: string }) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const visibility = (formData.get("visibility") as "public" | "private" | "unlisted") || "public";
    const youtubeAccountId = formData.get("youtubeAccountId") as string;
    const postImmediately = formData.get("postImmediately") === "true";
    const scheduledAt = formData.get("scheduledAt") as string | null;

    if (!title || title.length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "Video file is required" },
        { status: 400 }
      );
    }

    if (!youtubeAccountId) {
      return NextResponse.json(
        { error: "YouTube account is required" },
        { status: 400 }
      );
    }

    // Verify the YouTube account belongs to the user
    const youtubeAccount = await prisma.youTubeAccount.findFirst({
      where: {
        id: youtubeAccountId,
        userId: user.id,
      },
    });

    if (!youtubeAccount) {
      return NextResponse.json(
        { error: "YouTube account not found" },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);

    if (postImmediately) {
      // Upload video to YouTube immediately
      const credentials = {
        clientId: decrypt(youtubeAccount.clientId),
        clientSecret: decrypt(youtubeAccount.clientSecret),
        refreshToken: decrypt(youtubeAccount.refreshToken),
        accessToken: youtubeAccount.accessToken ? decrypt(youtubeAccount.accessToken) : undefined,
        accessTokenExpiry: youtubeAccount.accessTokenExpiry || undefined,
      };

      const result = await uploadVideo(
        videoBuffer,
        title,
        description || "",
        visibility,
        credentials
      );

      if (!result.success) {
        const post = await prisma.post.create({
          data: {
            content: title,
            platform: "youtube",
            videoTitle: title,
            videoDescription: description || "",
            videoVisibility: visibility,
            mediaUrls: null,
            status: "failed",
            error: result.error || "Failed to upload video",
            youtubeAccountId: youtubeAccount.id,
            userId: user.id,
          },
        });

        return NextResponse.json(
          { error: result.error || "Failed to upload video", post },
          { status: 500 }
        );
      }

      const post = await prisma.post.create({
        data: {
          content: title,
          platform: "youtube",
          videoTitle: title,
          videoDescription: description || "",
          videoVisibility: visibility,
          mediaUrls: null,
          status: "posted",
          postedAt: new Date(),
          youtubeVideoId: result.videoId,
          youtubeAccountId: youtubeAccount.id,
          userId: user.id,
        },
      });

      return NextResponse.json(post);
    }

    // For scheduled posts, we need to store the video somewhere
    // Since we want to avoid R2, return an error for now
    return NextResponse.json(
      { error: "Direct file upload is only supported for immediate posting. For scheduled posts, please use gallery videos." },
      { status: 400 }
    );
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file upload" },
      { status: 500 }
    );
  }
}
