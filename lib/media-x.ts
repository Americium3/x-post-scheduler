import { prisma } from "./db";
import { createXClient, type XCredentials } from "./x-client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserXCredentials } from "./user-credentials";

// ============================================================================
// Types
// ============================================================================

export interface XAccountToMonitor {
  id: string;
  xAccountId: string;
  username: string;
  label?: string;
  credentials: XCredentials;
}

export interface XTweetData {
  tweetId: string;
  username: string;
  text: string;
  createdAt: Date;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  mediaUrls?: string[];
}

export interface XAccountSnapshot {
  accountId: string;
  username: string;
  fetchedAt: string;
  tweets: XTweetData[];
  followersCount: number;
  followingCount: number;
}

export type ReportPeriod = "daily" | "weekly";

interface AiXTweetSummary {
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  highlightsEn: string[];
  highlightsZh: string[];
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Fetch all X accounts from database that need monitoring
 */
export async function getMonitoredXAccounts(): Promise<Array<{ id: string; xAccountId: string; username: string }>> {
  const monitoredAccounts = await prisma.mediaMonitorXAccounts.findMany({
    select: {
      id: true,
      xAccountId: true,
      username: true,
    },
  });

  console.log(`Found ${monitoredAccounts.length} monitored accounts in MediaMonitorXAccounts`);

  return monitoredAccounts;
}

/**
 * Fetch recent tweets from a specific X account based on period
 */
export async function fetchAccountTweets(
  account: XAccountToMonitor,
  period: ReportPeriod,
  maxResults: number = 20,
  targetDate?: Date,
): Promise<XTweetData[]> {
  try {
    const client = createXClient(account.credentials);

    // Look up the monitored account by xAccountId (which is the actual username like "elonmusk")
    const user = await client.v2.userByUsername(account.xAccountId);

    if (!user.data) {
      console.error(`User @${account.xAccountId} not found`);
      return [];
    }

    // Calculate start and end time based on period and targetDate
    let startDate: Date;
    let endDate: Date;

    if (targetDate) {
      // Fetch tweets for the specific date range
      const { rangeStart, rangeEnd } = calculateDateRange(period, targetDate);
      startDate = rangeStart;
      endDate = rangeEnd;
    } else {
      // Default behavior: fetch recent tweets
      endDate = new Date();
      startDate = new Date();
      if (period === "daily") {
        startDate.setHours(startDate.getHours() - 24);
      } else {
        // weekly: 7 days ago
        startDate.setDate(startDate.getDate() - 7);
      }
    }

    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    const paginator = await client.v2.userTimeline(user.data.id, {
      max_results: Math.min(100, Math.max(5, maxResults)),
      exclude: ["replies", "retweets"],
      start_time: startTime,
      end_time: endTime,
      "tweet.fields": ["created_at", "public_metrics", "attachments"],
      expansions: ["attachments.media_keys"],
      "media.fields": ["url", "preview_image_url", "type"],
    });

    const tweets = paginator.tweets ?? [];
    const mediaMap = new Map<string, string[]>();

    // Build media map
    if (paginator.includes?.media) {
      for (const media of paginator.includes.media) {
        const url =
          (media as { url?: string; preview_image_url?: string }).url ??
          (media as { url?: string; preview_image_url?: string })
            .preview_image_url;
        if (url && media.media_key) {
          if (!mediaMap.has(media.media_key)) {
            mediaMap.set(media.media_key, []);
          }
          mediaMap.get(media.media_key)!.push(url);
        }
      }
    }

    const results: XTweetData[] = [];

    for (const tweet of tweets) {
      const metrics = tweet.public_metrics;
      const mediaKeys =
        (tweet.attachments as { media_keys?: string[] })?.media_keys ?? [];
      const mediaUrls: string[] = [];

      for (const key of mediaKeys) {
        const urls = mediaMap.get(key);
        if (urls) mediaUrls.push(...urls);
      }

      results.push({
        tweetId: tweet.id,
        username: account.username,
        text: tweet.text ?? "",
        createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        impressions: metrics?.impression_count ?? 0,
        likes: metrics?.like_count ?? 0,
        retweets: metrics?.retweet_count ?? 0,
        replies: metrics?.reply_count ?? 0,
        quotes: metrics?.quote_count ?? 0,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      });
    }

    return results;
  } catch (error) {
    console.error(
      `Error fetching tweets for account ${account.username}:`,
      error,
    );
    return [];
  }
}

/**
 * Fetch account profile info (followers, following counts)
 */
export async function fetchAccountProfile(
  account: XAccountToMonitor,
): Promise<{ followersCount: number; followingCount: number } | null> {
  try {
    const client = createXClient(account.credentials);
    const me = await client.v1.verifyCredentials({ skip_status: true });

    return {
      followersCount: me.followers_count ?? 0,
      followingCount: me.friends_count ?? 0,
    };
  } catch (error) {
    console.error(
      `Error fetching profile for account ${account.username}:`,
      error,
    );
    return null;
  }
}

/**
 * Generate snapshot for a single X account
 */
export async function generateAccountSnapshot(
  account: XAccountToMonitor,
  period: ReportPeriod,
  maxTweets: number = 20,
  targetDate?: Date,
): Promise<XAccountSnapshot | null> {
  const [tweets, profile] = await Promise.all([
    fetchAccountTweets(account, period, maxTweets, targetDate),
    fetchAccountProfile(account),
  ]);

  if (tweets.length === 0 && !profile) {
    return null;
  }

  return {
    accountId: account.id,
    username: account.username,
    fetchedAt: new Date().toISOString(),
    tweets,
    followersCount: profile?.followersCount ?? 0,
    followingCount: profile?.followingCount ?? 0,
  };
}

/**
 * Generate snapshots for all monitored accounts
 */
export async function generateAllAccountSnapshots(
  userId: string,
  period: ReportPeriod,
  maxTweetsPerAccount: number = 20,
  targetDate?: Date,
): Promise<XAccountSnapshot[]> {
  const monitoredAccounts = await getMonitoredXAccounts();

  if (monitoredAccounts.length === 0) {
    console.log("No monitored X accounts found");
    return [];
  }

  // Get decrypted credentials from the current logged-in user
  const credentialsResult = await getUserXCredentials(userId);

  if (!credentialsResult) {
    console.log("No valid XAccount with credentials found for current user");
    return [];
  }

  console.log("Using credentials from current user's XAccount for API calls");

  const accountsWithCredentials: XAccountToMonitor[] = monitoredAccounts.map((acc) => ({
    id: acc.id,
    xAccountId: acc.xAccountId,
    username: acc.username,
    label: undefined,
    credentials: credentialsResult.credentials,
  }));

  console.log(`Fetching data from ${accountsWithCredentials.length} X accounts...`);

  const snapshots = await Promise.all(
    accountsWithCredentials.map((account) =>
      generateAccountSnapshot(account, period, maxTweetsPerAccount, targetDate),
    ),
  );

  return snapshots.filter((s): s is XAccountSnapshot => s !== null);
}

/**
 * Store account snapshot data to database with translation
 */
export async function storeAccountSnapshot(
  snapshot: XAccountSnapshot,
  period: ReportPeriod,
  reportDate?: Date,
): Promise<void> {
  const date = reportDate ?? new Date();
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

  // Ensure MediaMonitorXAccounts exists
  await prisma.mediaMonitorXAccounts.upsert({
    where: { id: snapshot.accountId },
    create: {
      id: snapshot.accountId,
      xAccountId: snapshot.accountId,
      username: snapshot.username,
    },
    update: {
      username: snapshot.username,
    },
  });

  // Aggregate all tweets into a single fullContent with timestamps
  const fullContent = snapshot.tweets
    .map((tweet) => `[${tweet.createdAt.toISOString()}] ${tweet.text}`)
    .join("\n\n");

  // Translate to Chinese immediately
  const fullContentZh = await translateXTweetContentForZh(fullContent);

  // Get first image from tweets
  const imageUrl = snapshot.tweets.find((t) => t.mediaUrls && t.mediaUrls.length > 0)
    ?.mediaUrls?.[0];

  // Store tweet snapshot with translation
  await prisma.mediaXTweetSource.upsert({
    where: {
      reportDate_period_xAccountId: {
        reportDate: dateStr,
        period,
        xAccountId: snapshot.accountId,
      },
    },
    create: {
      reportDate: dateStr,
      period,
      xAccountId: snapshot.accountId,
      username: snapshot.username,
      fullContent,
      fullContentZh,
      imageUrl: imageUrl ?? null,
    },
    update: {
      fullContent,
      fullContentZh,
      imageUrl: imageUrl ?? null,
    },
  });

  console.log(`Stored snapshot for @${snapshot.username} (${dateStr}, ${period})`);
}

/**
 * Translate X tweet content to Chinese using Gemini AI
 */
export async function translateXTweetContentForZh(
  content: string,
): Promise<string> {
  if (!process.env.GEMINI_API_KEY || !content) {
    return content;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "text/plain",
        maxOutputTokens: 3000,
        temperature: 0.2,
      },
    });

    const prompt = `You are a professional media translator. Translate the following English article content into Simplified Chinese. Maintain professional journalism tone. Return ONLY String. Return Chinese translation of the body text. If body is empty, return None.

    Body:
    ${content}`;
    
    const result = await model.generateContent(prompt);
    const translated = result.response.text();

    // const json = JSON.parse(translated);
    // const paragraphsZh = json.paragraphsZh;

    return translated || content;
  } catch (error) {
    console.error("Translation error:", error);
    return content; // Fallback to original
  }
}

/**
 * Translate and update stored X tweet snapshots
 */
export async function translateAndStoreXTweetSnapshotsZh(
  reportDate: string,
  period: ReportPeriod,
): Promise<void> {
  const snapshots = await prisma.mediaXTweetSource.findMany({
    where: {
      reportDate,
      period,
      fullContentZh: null,
    },
  });

  if (snapshots.length === 0) {
    console.log(`No untranslated snapshots found for ${reportDate} (${period})`);
    return;
  }

  console.log(`Translating ${snapshots.length} X tweet snapshots...`);

  for (const snapshot of snapshots) {
    const translatedContent = await translateXTweetContentForZh(
      snapshot.fullContent,
    );

    await prisma.mediaXTweetSource.update({
      where: { id: snapshot.id },
      data: { fullContentZh: translatedContent },
    });

    console.log(`Translated snapshot for @${snapshot.username}`);
  }

  console.log(`Translation complete for ${reportDate} (${period})`);
}

/**
 * Calculate date range based on period
 * Exported for use in fetchAccountTweets
 */
export function calculateDateRange(
  period: ReportPeriod,
  reportDate?: Date,
): { rangeStart: Date; rangeEnd: Date; reportDateStr: string } {
  const date = reportDate ?? new Date();
  const reportDateStr = date.toISOString().slice(0, 10);

  if (period === "daily") {
    const rangeStart = new Date(date);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);
    rangeEnd.setUTCMilliseconds(-1);
    return { rangeStart, rangeEnd, reportDateStr };
  } else {
    // weekly: Monday to Sunday
    const rangeStart = new Date(date);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = rangeStart.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    rangeStart.setUTCDate(rangeStart.getUTCDate() + daysToMonday);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 7);
    rangeEnd.setUTCMilliseconds(-1);
    return { rangeStart, rangeEnd, reportDateStr };
  }
}

/**
 * Generate AI summary for X tweets
 */
async function generateAiXTweetSummary(
  tweets: Array<{ username: string; text: string; createdAt: Date }>,
  period: ReportPeriod,
  reportDate: string,
): Promise<AiXTweetSummary | null> {
  if (!process.env.GEMINI_API_KEY || tweets.length === 0) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        // maxOutputTokens: 3000,
      },
    });

    const condensedTweets = tweets.slice(0, 20).map((tweet, index) => ({
      index: index + 1,
      username: tweet.username,
      text: tweet.text,
      createdAt: tweet.createdAt.toISOString(),
    }));

    const prompt = `You are a senior editor at a media-industry newsletter. You write concise, specific headlines that cover multiple distinct stories — never just one headline story. Output must be valid JSON.

Create a bilingual ${period} briefing for report date ${reportDate}.

Return JSON matching this exact schema:
{
  "titleEn": "string (Max 15 words)",
  "titleZh": "string (Max 25 Chinese characters)",
  "summaryEn": "string (Max 50 words total, strictly 2-3 sentences)",
  "summaryZh": "string (Max 100 Chinese characters total, strictly 2-3 sentences)",
  "highlightsEn": ["string (Max 20 words per bullet)", "..."],
  "highlightsZh": ["string (Max 40 Chinese characters per bullet)", "..."]
}

TITLE RULES (critical):
- The title MUST combine 2 DIFFERENT stories or themes from the article list — pick the two most interesting that contrast or complement each other.
- FORBIDDEN: Using only the single biggest headline as the entire title.
- FORBIDDEN words: "developments", "updates", "insights", "roundup", "wrap"
- WRONG (single story): "Netflix Exits WBD-Paramount Bid"
- WRONG (generic): "Media Industry Developments: Streaming and AI"
- RIGHT (two stories): "Netflix Exits Paramount Bid; Meta Tests AI-Generated Ads on Reels"
- RIGHT (two stories): "YouTube Expands Shorts Monetization as Spotify Reports Record Podcast Revenue"
- titleZh should follow the same two-story structure, using "；" as separator or natural conjunction.

CONTENT RULES:
- summaryEn and summaryZh: 2–3 sentences summarizing key themes
- highlightsEn and highlightsZh: exactly 6-8 bullets each
- Focus on actionable insights and specific observations
- Professional tone
- Prioritize articles with the most recent publishedAt date.
- If period is weekly, surface strategic signals over single-day events.

Tweets:
${JSON.stringify(condensedTweets, null, 2)}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AiXTweetSummary>;

    const titleEn = parsed.titleEn?.trim() || (period === "weekly" ? "X Accounts Weekly Summary" : "X Accounts Daily Summary");
    const titleZh = parsed.titleZh?.trim() || (period === "weekly" ? "X 账号周报" : "X 账号日报");
    const summaryEn = parsed.summaryEn?.trim() || "Summary of monitored X account activities.";
    const summaryZh = parsed.summaryZh?.trim() || "监控 X 账号活动摘要。";

    const highlightsEn = (parsed.highlightsEn ?? [])
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item))
      .slice(0, 8);
    const highlightsZh = (parsed.highlightsZh ?? [])
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item))
      .slice(0, 8);

    if (!summaryEn || !summaryZh || highlightsEn.length < 3 || highlightsZh.length < 3) {
      return null;
    }

    return {
      titleEn,
      titleZh,
      summaryEn,
      summaryZh,
      highlightsEn,
      highlightsZh,
    };
  } catch (error) {
    console.error("Failed to generate AI X tweet summary:", error);
    return null;
  }
}

/**
 * Generate and store X tweet report with AI summary
 */
export async function generateAndStoreXTweetReport(
  period: ReportPeriod = "daily",
  reportDate?: Date,
): Promise<{
  success: boolean;
  reportDate: string;
  sourceCount: number;
  usedAi: boolean;
} | null> {
  const { rangeStart, rangeEnd, reportDateStr } = calculateDateRange(period, reportDate);

  // Fetch all tweet sources for this period
  const sources = await prisma.mediaXTweetSource.findMany({
    where: {
      reportDate: reportDateStr,
      period,
    },
  });

  if (sources.length === 0) {
    console.log(`No X tweet sources found for ${reportDateStr} (${period})`);
    return null;
  }

  // Parse tweets from fullContent
  const allTweets: Array<{ username: string; text: string; createdAt: Date }> = [];
  for (const source of sources) {
    const lines = source.fullContent.split("\n\n");
    for (const line of lines) {
      const match = line.match(/^\[(.+?)\] (.+)$/);
      if (match) {
        allTweets.push({
          username: source.username,
          text: match[2],
          createdAt: new Date(match[1]),
        });
      }
    }
  }

  // Generate AI summary
  const aiSummary = await generateAiXTweetSummary(allTweets, period, reportDateStr);
  const usedAi = aiSummary !== null;

  const titleEn = aiSummary?.titleEn || (period === "weekly" ? "X Accounts Weekly Summary" : "X Accounts Daily Summary");
  const titleZh = aiSummary?.titleZh || (period === "weekly" ? "X 账号周报" : "X 账号日报");
  const summaryEn = aiSummary?.summaryEn || "Summary of monitored X account activities.";
  const summaryZh = aiSummary?.summaryZh || "监控 X 账号活动摘要。";
  const highlightsEn = aiSummary?.highlightsEn || ["No highlights available"];
  const highlightsZh = aiSummary?.highlightsZh || ["暂无亮点"];

  // Get cover image from first source
  const coverImageUrl = sources.find((s) => s.imageUrl)?.imageUrl || null;

  // Store report
  await prisma.mediaXTweetReport.upsert({
    where: {
      period_reportDate: {
        period,
        reportDate: new Date(reportDateStr),
      },
    },
    create: {
      period,
      reportDate: new Date(reportDateStr),
      rangeStart,
      rangeEnd,
      titleEn,
      titleZh,
      summaryEn,
      summaryZh,
      highlightsEn: JSON.stringify(highlightsEn),
      highlightsZh: JSON.stringify(highlightsZh),
      coverImageUrl,
      sourceCount: sources.length,
      usedAi,
    },
    update: {
      rangeStart,
      rangeEnd,
      titleEn,
      titleZh,
      summaryEn,
      summaryZh,
      highlightsEn: JSON.stringify(highlightsEn),
      highlightsZh: JSON.stringify(highlightsZh),
      coverImageUrl,
      sourceCount: sources.length,
      usedAi,
    },
  });

  console.log(`Stored X tweet report for ${reportDateStr} (${period})`);

  return {
    success: true,
    reportDate: reportDateStr,
    sourceCount: sources.length,
    usedAi,
  };
}

/**
 * Main function: Fetch and store data from all monitored X accounts
 */
export async function syncMonitoredAccounts(
  userId: string,
  period: ReportPeriod = "daily",
  maxTweetsPerAccount: number = 20,
  reportDate?: Date,
): Promise<{
  success: boolean;
  reportDate: string;
  accountCount: number;
  totalTweets: number;
  sourceCount: number;
  usedAi: boolean;
}> {
  try {
    const date = reportDate ?? new Date();
    const dateStr = date.toISOString().slice(0, 10);

    // Step 1: Fetch tweets from all monitored accounts
    const snapshots = await generateAllAccountSnapshots(userId, period, maxTweetsPerAccount, date);

    if (snapshots.length === 0) {
      console.log("No snapshots generated");
      return {
        success: false,
        reportDate: dateStr,
        accountCount: 0,
        totalTweets: 0,
        sourceCount: 0,
        usedAi: false,
      };
    }

    // Step 2: Translate and store each snapshot (always as daily)
    let totalTweets = 0;
    for (const snapshot of snapshots) {
      // await storeAccountSnapshot(snapshot, "daily", date);
      await storeAccountSnapshot(snapshot, period, date);
      totalTweets += snapshot.tweets.length;
    }

    // Step 3: Collect all tweets for AI summary
    const allTweets: Array<{ username: string; text: string; createdAt: Date }> = [];
    for (const snapshot of snapshots) {
      for (const tweet of snapshot.tweets) {
        allTweets.push({
          username: snapshot.username,
          text: tweet.text,
          createdAt: tweet.createdAt,
        });
      }
    }

    // Step 4: Generate AI summary immediately
    const aiSummary = await generateAiXTweetSummary(allTweets, period, dateStr);
    const usedAi = aiSummary !== null;

    const titleEn = aiSummary?.titleEn || (period === "weekly" ? "X Accounts Weekly Summary" : "X Accounts Daily Summary");
    const titleZh = aiSummary?.titleZh || (period === "weekly" ? "X 账号周报" : "X 账号日报");
    const summaryEn = aiSummary?.summaryEn || "Summary of monitored X account activities.";
    const summaryZh = aiSummary?.summaryZh || "监控 X 账号活动摘要。";
    const highlightsEn = aiSummary?.highlightsEn || ["No highlights available"];
    const highlightsZh = aiSummary?.highlightsZh || ["暂无亮点"];

    // Get cover image from first snapshot
    const coverImageUrl = snapshots.find((s) => s.tweets.some(t => t.mediaUrls && t.mediaUrls.length > 0))
      ?.tweets.find(t => t.mediaUrls && t.mediaUrls.length > 0)?.mediaUrls?.[0] || null;

    const { rangeStart, rangeEnd } = calculateDateRange(period, date);

    // Step 5: Store report to database
    await prisma.mediaXTweetReport.upsert({
      where: {
        period_reportDate: {
          period,
          reportDate: new Date(dateStr),
        },
      },
      create: {
        period,
        reportDate: new Date(dateStr),
        rangeStart,
        rangeEnd,
        titleEn,
        titleZh,
        summaryEn,
        summaryZh,
        highlightsEn: JSON.stringify(highlightsEn),
        highlightsZh: JSON.stringify(highlightsZh),
        coverImageUrl,
        sourceCount: snapshots.length,
        usedAi,
      },
      update: {
        rangeStart,
        rangeEnd,
        titleEn,
        titleZh,
        summaryEn,
        summaryZh,
        highlightsEn: JSON.stringify(highlightsEn),
        highlightsZh: JSON.stringify(highlightsZh),
        coverImageUrl,
        sourceCount: snapshots.length,
        usedAi,
      },
    });

    console.log(`Stored X tweet report for ${dateStr} (${period})`);

    return {
      success: true,
      reportDate: dateStr,
      accountCount: snapshots.length,
      totalTweets,
      sourceCount: snapshots.length,
      usedAi,
    };
  } catch (error) {
    console.error("Error syncing monitored accounts:", error);
    const dateStr = (reportDate ?? new Date()).toISOString().slice(0, 10);
    return {
      success: false,
      reportDate: dateStr,
      accountCount: 0,
      totalTweets: 0,
      sourceCount: 0,
      usedAi: false,
    };
  }
}

/**
 * Get X tweet report by date
 */
export async function getXReportByDate(
  date: string,
  period: ReportPeriod = "daily",
): Promise<{
  date: string;
  period: string;
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  highlightsEn: string[];
  highlightsZh: string[];
  coverImageUrl: string | null;
  sourceCount: number;
  usedAi: boolean;
} | null> {
  try {
    const reportDate = new Date(`${date}T00:00:00.000Z`);
    const report = await prisma.mediaXTweetReport.findFirst({
      where: {
        period,
        reportDate,
      },
    });

    if (!report) return null;

    return {
      date: report.reportDate.toISOString().slice(0, 10),
      period: report.period,
      titleEn: report.titleEn,
      titleZh: report.titleZh,
      summaryEn: report.summaryEn,
      summaryZh: report.summaryZh,
      highlightsEn: JSON.parse(report.highlightsEn) as string[],
      highlightsZh: JSON.parse(report.highlightsZh) as string[],
      coverImageUrl: report.coverImageUrl,
      sourceCount: report.sourceCount,
      usedAi: report.usedAi,
    };
  } catch {
    return null;
  }
}

/**
 * Get X source tweets by date
 */
export async function getXSourceTweets(
  date: string,
  period: ReportPeriod = "daily",
): Promise<Array<{
  id: string;
  username: string;
  fullContent: string;
  fullContentZh: string | null;
  imageUrl: string | null;
}>> {
  try {
    const sources = await prisma.mediaXTweetSource.findMany({
      where: {
        reportDate: date,
        period,
      },
      orderBy: {
        username: "asc",
      },
    });

    return sources.map((s) => ({
      id: s.id,
      username: s.username,
      fullContent: s.fullContent,
      fullContentZh: s.fullContentZh,
      imageUrl: s.imageUrl,
    }));
  } catch {
    return [];
  }
}

/**
 * List stored X tweet reports
 */
export async function listStoredXReports(
  period: ReportPeriod,
  limit: number = 30,
): Promise<Array<{
  date: string;
}>> {
  try {
    const reports = await prisma.mediaXTweetReport.findMany({
      where: { period },
      orderBy: { reportDate: "desc" },
      take: limit,
    });

    return reports.map((r) => ({
      date: r.reportDate.toISOString().slice(0, 10),
    }));
  } catch {
    return [];
  }
}

/**
 * Get latest X tweet report (internal helper)
 */
async function getLatestXTweetReport(period: ReportPeriod) {
  const report = await prisma.mediaXTweetReport.findFirst({
    where: { period },
    orderBy: { reportDate: "desc" },
  });

  if (!report) return null;

  return {
    date: report.reportDate.toISOString().slice(0, 10),
    period: report.period,
    titleEn: report.titleEn,
    titleZh: report.titleZh,
    summaryEn: report.summaryEn,
    summaryZh: report.summaryZh,
    highlightsEn: JSON.parse(report.highlightsEn) as string[],
    highlightsZh: JSON.parse(report.highlightsZh) as string[],
    coverImageUrl: report.coverImageUrl,
    sourceCount: report.sourceCount,
    usedAi: report.usedAi,
  };
}

/**
 * List X tweet reports with title info (internal helper)
 */
async function listXTweetReports(period: ReportPeriod, limit: number) {
  const reports = await prisma.mediaXTweetReport.findMany({
    where: { period },
    orderBy: { reportDate: "desc" },
    take: limit,
  });

  return reports.map((r) => ({
    date: r.reportDate.toISOString().slice(0, 10),
    titleEn: r.titleEn,
    titleZh: r.titleZh,
    sourceCount: r.sourceCount,
  }));
}

/**
 * Get all media-x data for the intelligence page
 */
export async function getMediaXIntelligenceData() {
  try {
    const [latest, latestWeekly, dailyArchiveRaw] = await Promise.all([
      getLatestXTweetReport("daily"),
      getLatestXTweetReport("weekly"),
      listXTweetReports("daily", 14),
    ]);

    const dailyArchive = dailyArchiveRaw.filter(
      (item) => item.date !== latest?.date,
    );

    return {
      latest,
      latestWeekly,
      dailyArchive,
    };
  } catch (error) {
    console.error("Error fetching media-x reports:", error);
    return {
      latest: null,
      latestWeekly: null,
      dailyArchive: [],
    };
  }
}
