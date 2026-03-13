import { NextRequest, NextResponse } from "next/server";
import { detectCronTrigger, logCronRun } from "@/lib/cron-logging";
import {
  syncMonitoredAccounts,
  type ReportPeriod,
} from "@/lib/media-x";
import { prisma } from "@/lib/db";

type TriggerPeriod = ReportPeriod | "both";

function parsePeriod(input: string | null): TriggerPeriod {
  if (input === "weekly") return "weekly";
  if (input === "both") return "both";
  return "daily";
}

function isSundayUtc(now: Date): boolean {
  return now.getUTCDay() === 0;
}

async function handleRequest(request: NextRequest) {
  const startedAt = Date.now();
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      await logCronRun({
        jobName: "media-x-report",
        endpoint: "/api/cron/media-x",
        method: request.method,
        success: false,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
        triggeredBy: detectCronTrigger(request),
        error: "Unauthorized",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const period = parsePeriod(request.nextUrl.searchParams.get("period"));
  const forceWeekly = request.nextUrl.searchParams.get("forceWeekly") === "1";
  const shouldRunWeekly =
    period === "weekly" || period === "both"
      ? true
      : forceWeekly || isSundayUtc(new Date());

  // Get userId from environment email
  const systemUserEmail = process.env.SYSTEM_USER_EMAIL;
  if (!systemUserEmail) {
    return NextResponse.json(
      { error: "SYSTEM_USER_EMAIL not configured" },
      { status: 500 },
    );
  }

  // Look up user by email
  const systemUser = await prisma.user.findFirst({
    where: { email: systemUserEmail },
    select: { id: true },
  });

  if (!systemUser) {
    return NextResponse.json(
      { error: "System user not found with provided email" },
      { status: 500 },
    );
  }

  const systemUserId = systemUser.id;

  try {
    const results: Record<string, unknown> = {};

    if (period === "daily" || period === "both") {
      results.daily = await syncMonitoredAccounts(systemUserId, "daily", 20);
    }

    if (period === "weekly" || shouldRunWeekly) {
      results.weekly = await syncMonitoredAccounts(systemUserId, "weekly", 20);
    }

    await logCronRun({
      jobName: "media-x-report",
      endpoint: "/api/cron/media-x",
      method: request.method,
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      triggeredBy: detectCronTrigger(request),
      metadata: {
        period,
        forceWeekly,
        shouldRunWeekly,
        hasDaily: Boolean(results.daily),
        hasWeekly: Boolean(results.weekly),
      },
    });

    return NextResponse.json(
      {
        success: true,
        period,
        forceWeekly,
        shouldRunWeekly,
        dailyStored: Boolean(results.daily),
        weeklyStored: Boolean(results.weekly),
        results,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate reports";

    await logCronRun({
      jobName: "media-x-report",
      endpoint: "/api/cron/media-x",
      method: request.method,
      success: false,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      triggeredBy: detectCronTrigger(request),
      error: errorMessage,
      metadata: { period, forceWeekly },
    });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
