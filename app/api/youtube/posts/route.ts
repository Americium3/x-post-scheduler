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
          mediaUrls: JSON.stringify([videoUrl]),
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
