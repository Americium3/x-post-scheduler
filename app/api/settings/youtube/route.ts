import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { google } from "googleapis";
import { getAccountLimit } from "@/lib/subscription";

export async function GET() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const youtubeAccounts = await prisma.youTubeAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      channelTitle: true,
      channelId: true,
      isDefault: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ youtubeAccounts });
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { label, clientId, clientSecret, code } = body;

  // If code is provided, exchange it for tokens
  if (code) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings`
      );

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        return NextResponse.json(
          { error: "No refresh token received. Please revoke access and try again." },
          { status: 400 }
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
        return NextResponse.json(
          { error: "No YouTube channel found" },
          { status: 404 }
        );
      }

      const [youtubeCount, xCount, dbUser] = await Promise.all([
        prisma.youTubeAccount.count({ where: { userId: user.id } }),
        prisma.xAccount.count({ where: { userId: user.id } }),
        prisma.user.findUnique({ where: { id: user.id }, select: { subscriptionTier: true } }),
      ]);

      const existingCount = youtubeCount + xCount;
      const accountLimit = getAccountLimit(dbUser?.subscriptionTier);
      if (existingCount >= accountLimit) {
        return NextResponse.json(
          { error: "ACCOUNT_LIMIT_REACHED", limit: accountLimit },
          { status: 403 }
        );
      }

      const shouldBeDefault = youtubeCount === 0;

      const youtubeAccount = await prisma.$transaction(async (tx) => {
        if (shouldBeDefault) {
          await tx.youTubeAccount.updateMany({
            where: { userId: user.id, isDefault: true },
            data: { isDefault: false },
          });
        }

        return tx.youTubeAccount.create({
          data: {
            userId: user.id,
            channelTitle: channel.snippet?.title || label || "YouTube Channel",
            channelId: channel.id || "",
            subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
            clientId: encrypt(clientId),
            clientSecret: encrypt(clientSecret),
            accessToken: tokens.access_token ? encrypt(tokens.access_token) : "",
            refreshToken: encrypt(tokens.refresh_token!),
            accessTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            isDefault: shouldBeDefault,
            lastSyncedAt: new Date(),
          },
        });
      });

      return NextResponse.json({
        id: youtubeAccount.id,
        channelTitle: youtubeAccount.channelTitle,
        channelId: youtubeAccount.channelId,
        isDefault: youtubeAccount.isDefault,
      });
    } catch (error) {
      console.error("YouTube token exchange error:", error);
      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 500 }
      );
    }
  }

  // Generate OAuth URL with provided credentials
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Client ID and Secret are required" },
      { status: 400 }
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings`
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube.force-ssl",
      ],
      state: JSON.stringify({ userId: user.id, clientId, clientSecret }),
      prompt: "consent",
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("YouTube OAuth URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { youtubeAccountId } = body;

  if (!youtubeAccountId) {
    return NextResponse.json(
      { error: "YouTube account ID is required" },
      { status: 400 }
    );
  }

  try {
    // Set as default
    await prisma.$transaction([
      prisma.youTubeAccount.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.youTubeAccount.update({
        where: { id: youtubeAccountId },
        data: { isDefault: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("YouTube account update error:", error);
    return NextResponse.json(
      { error: "Failed to update YouTube account" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const youtubeAccountId = request.nextUrl.searchParams.get("youtubeAccountId");

  if (!youtubeAccountId) {
    return NextResponse.json(
      { error: "YouTube account ID is required" },
      { status: 400 }
    );
  }

  try {
    const account = await prisma.youTubeAccount.findFirst({
      where: { id: youtubeAccountId, userId: user.id },
      select: { id: true, isDefault: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    await prisma.youTubeAccount.delete({ where: { id: account.id } });

    // If deleted account was default, set another as default
    if (account.isDefault) {
      const replacement = await prisma.youTubeAccount.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (replacement) {
        await prisma.youTubeAccount.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("YouTube account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete YouTube account" },
      { status: 500 }
    );
  }
}
