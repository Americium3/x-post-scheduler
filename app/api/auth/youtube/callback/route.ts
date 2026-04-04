import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // This is the user ID
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings?youtube_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings?youtube_error=missing_params`
    );
  }

  const userId = state;

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${process.env.APP_BASE_URL || "http://localhost:3000"}/api/auth/youtube/callback`
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings?youtube_error=no_refresh_token`
      );
    }

    oauth2Client.setCredentials(tokens);

    // Get channel information
    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    const channelResponse = await youtube.channels.list({
      part: ["snippet", "statistics"],
      mine: true,
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      return NextResponse.redirect(
        `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings?youtube_error=no_channel`
      );
    }

    // Check if this is the first YouTube account for this user
    const existingCount = await prisma.youTubeAccount.count({
      where: { userId },
    });

    const shouldBeDefault = existingCount === 0;

    // Save to database
    await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        // Set all existing accounts to non-default
        await tx.youTubeAccount.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      await tx.youTubeAccount.create({
        data: {
          userId,
          channelTitle: channel.snippet?.title || "YouTube Channel",
          channelId: channel.id || "",
          subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
          refreshToken: encrypt(tokens.refresh_token),
          accessToken: tokens.access_token ? encrypt(tokens.access_token) : null,
          accessTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          isDefault: shouldBeDefault,
          lastSyncedAt: new Date(),
        },
      });
    });

    return NextResponse.redirect(
      `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings?youtube_success=true`
    );
  } catch (error) {
    console.error("YouTube OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings?youtube_error=auth_failed`
    );
  }
}
