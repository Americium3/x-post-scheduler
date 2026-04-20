import { google } from "googleapis";
import { Readable } from "stream";

export interface YouTubeCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiry?: Date;
}

export interface UploadResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

export interface ChannelInfo {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
}

/**
 * Create a YouTube API client with OAuth2 credentials and auto-refresh
 */
export async function createYouTubeClient(credentials: YouTubeCredentials): Promise<{
  youtube: ReturnType<typeof google.youtube>;
  oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  needsTokenUpdate: boolean;
  newAccessToken?: string;
  newExpiry?: Date;
}> {
  // IMPORTANT: redirect_uri must match the one used when obtaining the authorization code
  // In our case, it's /settings (see app/api/settings/youtube/route.ts line 48)
  const oauth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings`
  );

  oauth2Client.setCredentials({
    refresh_token: credentials.refreshToken,
    access_token: credentials.accessToken,
    expiry_date: credentials.accessTokenExpiry?.getTime(),
  });

  let needsTokenUpdate = false;
  let newAccessToken: string | undefined;
  let newExpiry: Date | undefined;

  // Check if token is expired or will expire soon (within 5 minutes)
  const now = Date.now();
  const expiryTime = credentials.accessTokenExpiry?.getTime() || 0;
  const fiveMinutes = 5 * 60 * 1000;

  if (!credentials.accessToken || expiryTime - now < fiveMinutes) {
    console.log('[YouTubeClient] Access token expired or expiring soon, refreshing...');
    console.log('[YouTubeClient] Debug info:', {
      hasRefreshToken: !!credentials.refreshToken,
      hasClientId: !!credentials.clientId,
      hasClientSecret: !!credentials.clientSecret,
      redirectUri: `${process.env.APP_BASE_URL || "http://localhost:3000"}/settings`,
    });
    
    try {
      const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
      
      if (newCredentials.access_token && newCredentials.expiry_date) {
        newAccessToken = newCredentials.access_token;
        newExpiry = new Date(newCredentials.expiry_date);
        needsTokenUpdate = true;
        
        oauth2Client.setCredentials(newCredentials);
        console.log('[YouTubeClient] Access token refreshed successfully');
      }
    } catch (error) {
      console.error('[YouTubeClient] Failed to refresh access token:', error);
      // Log more details about the error
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as any;
        console.error('[YouTubeClient] Error response:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        });
      }
      // Re-throw the error so it can be handled upstream
      throw error;
    }
  }

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  return {
    youtube,
    oauth2Client,
    needsTokenUpdate,
    newAccessToken,
    newExpiry,
  };
}

/**
 * Upload a video to YouTube
 */
export async function uploadVideo(
  videoBuffer: Buffer,
  title: string,
  description: string,
  visibility: "public" | "private" | "unlisted",
  credentials: YouTubeCredentials
): Promise<UploadResult & { newAccessToken?: string; newExpiry?: Date }> {
  try {
    const { youtube, needsTokenUpdate, newAccessToken, newExpiry } = await createYouTubeClient(credentials);

    // Convert Buffer to Readable stream
    const videoStream = Readable.from(videoBuffer);

    const response = await youtube.videos.insert(
      {
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title,
            description,
          },
          status: {
            privacyStatus: visibility,
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: videoStream,
        },
      },
      {
        onUploadProgress: (evt) => {
          const progress = Math.round((evt.bytesRead / (evt.bytesRead + 1)) * 100);
          console.log(`YouTube upload progress: ${progress}%`);
        },
      }
    );

    return {
      success: true,
      videoId: response.data.id || undefined,
      newAccessToken: needsTokenUpdate ? newAccessToken : undefined,
      newExpiry: needsTokenUpdate ? newExpiry : undefined,
    };
  } catch (error) {
    console.error("Error uploading video to YouTube:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Schedule a video for later publishing
 */
export async function scheduleVideo(
  videoBuffer: Buffer,
  title: string,
  description: string,
  publishAt: Date,
  credentials: YouTubeCredentials
): Promise<UploadResult> {
  try {
    const { youtube } = await createYouTubeClient(credentials);

    // Convert Buffer to Readable stream
    const videoStream = Readable.from(videoBuffer);

    const response = await youtube.videos.insert(
      {
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title,
            description,
          },
          status: {
            privacyStatus: "private",
            publishAt: publishAt.toISOString(),
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: videoStream,
        },
      },
      {
        onUploadProgress: (evt) => {
          const progress = Math.round((evt.bytesRead / (evt.bytesRead + 1)) * 100);
          console.log(`YouTube scheduled upload progress: ${progress}%`);
        },
      }
    );

    return {
      success: true,
      videoId: response.data.id || undefined,
    };
  } catch (error) {
    console.error("Error scheduling video on YouTube:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Verify YouTube credentials and get channel info
 */
export async function verifyCredentials(
  credentials: YouTubeCredentials
): Promise<{
  valid: boolean;
  channelInfo?: ChannelInfo;
  error?: string;
}> {
  try {
    const { youtube } = await createYouTubeClient(credentials);

    const response = await youtube.channels.list({
      part: ["snippet", "statistics"],
      mine: true,
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      return {
        valid: false,
        error: "No channel found",
      };
    }

    return {
      valid: true,
      channelInfo: {
        channelId: channel.id ?? "",
        channelTitle: channel.snippet?.title ?? "",
        subscriberCount: parseInt(channel.statistics?.subscriberCount ?? "0"),
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get channel information
 */
export async function getChannelInfo(
  credentials: YouTubeCredentials
): Promise<ChannelInfo | null> {
  try {
    const { youtube } = await createYouTubeClient(credentials);

    const response = await youtube.channels.list({
      part: ["snippet", "statistics"],
      mine: true,
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      return null;
    }

    return {
      channelId: channel.id ?? "",
      channelTitle: channel.snippet?.title ?? "",
      subscriberCount: parseInt(channel.statistics?.subscriberCount ?? "0"),
    };
  } catch (error) {
    console.error("Error fetching channel info:", error);
    return null;
  }
}

/**
 * Update video metadata (title, description, visibility)
 */
export async function updateVideo(
  videoId: string,
  title: string,
  description: string,
  visibility: "public" | "private" | "unlisted",
  credentials: YouTubeCredentials
): Promise<UploadResult> {
  try {
    const { youtube } = await createYouTubeClient(credentials);

    const response = await youtube.videos.update({
      part: ["snippet", "status"],
      requestBody: {
        id: videoId,
        snippet: {
          title,
          description,
        },
        status: {
          privacyStatus: visibility,
        },
      },
    });

    return {
      success: true,
      videoId: response.data.id || undefined,
    };
  } catch (error) {
    console.error("Error updating video on YouTube:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Update only video visibility (privacy status)
 */
export async function updateVideoVisibility(
  videoId: string,
  visibility: "public" | "private" | "unlisted",
  credentials: YouTubeCredentials
): Promise<UploadResult & { newAccessToken?: string; newExpiry?: Date }> {
  try {
    const { youtube, needsTokenUpdate, newAccessToken, newExpiry } = await createYouTubeClient(credentials);

    const response = await youtube.videos.update({
      part: ["status"],
      requestBody: {
        id: videoId,
        status: {
          privacyStatus: visibility,
        },
      },
    });

    return {
      success: true,
      videoId: response.data.id || undefined,
      newAccessToken: needsTokenUpdate ? newAccessToken : undefined,
      newExpiry: needsTokenUpdate ? newExpiry : undefined,
    };
  } catch (error) {
    console.error("Error updating video visibility on YouTube:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get video statistics
 */
export async function getVideoStats(
  videoId: string,
  credentials: YouTubeCredentials
): Promise<{
  views: number;
  likes: number;
  comments: number;
} | null> {
  try {
    const { youtube } = await createYouTubeClient(credentials);

    const response = await youtube.videos.list({
      part: ["statistics"],
      id: [videoId],
    });

    const video = response.data.items?.[0];
    if (!video?.statistics) {
      return null;
    }

    return {
      views: parseInt(video.statistics.viewCount || "0"),
      likes: parseInt(video.statistics.likeCount || "0"),
      comments: parseInt(video.statistics.commentCount || "0"),
    };
  } catch (error) {
    console.error("Error fetching video stats:", error);
    return null;
  }
}
