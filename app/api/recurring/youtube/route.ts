import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, addWeeks, addHours } from "date-fns";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";

function calculateNextRun(frequency: string, cronExpr: string): Date {
  const now = new Date();
  const [hours, minutes] = cronExpr.split(":").map(Number);
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun <= now) {
    if (frequency === "daily") {
      nextRun = addDays(nextRun, 1);
    } else if (frequency === "weekly") {
      nextRun = addWeeks(nextRun, 1);
    }
  }

  return nextRun;
}

export async function GET() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const [schedules, recurringUsage, dbUser] = await Promise.all([
    prisma.recurringYoutubeSchedule.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { nextRunAt: "asc" },
    }),
    prisma.usageEvent.aggregate({
      where: {
        userId: user.id,
        source: { startsWith: "recurring_youtube_" },
      },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
      _count: { _all: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { creditBalanceCents: true },
    }),
  ]);

  return NextResponse.json({
    schedules,
    balanceCents: dbUser?.creditBalanceCents ?? 0,
    usage: {
      requests: recurringUsage._count._all,
      promptTokens: recurringUsage._sum.promptTokens ?? 0,
      completionTokens: recurringUsage._sum.completionTokens ?? 0,
      totalTokens: recurringUsage._sum.totalTokens ?? 0,
    },
  });
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const {
    aiPrompt,
    aiLanguage,
    model,
    aspectRatio,
    duration,
    trendRegion,
    youtubeAccountId,
    frequency,
    cronExpr,
  } = body;

  if (!youtubeAccountId) {
    return NextResponse.json({ error: "YouTube account is required" }, { status: 400 });
  }

  if (!frequency || !cronExpr) {
    return NextResponse.json({ error: "Frequency and time are required" }, { status: 400 });
  }

  const nextRunAt = calculateNextRun(frequency, cronExpr);

  const schedule = await prisma.recurringYoutubeSchedule.create({
    data: {
      content: "",
      useAi: true,
      aiPrompt: aiPrompt || null,
      aiLanguage: aiLanguage || null,
      aspectRatio: aspectRatio || null,
      duration: duration || null,
      model: model || null,
      trendRegion: trendRegion || null,
      frequency,
      cronExpr,
      nextRunAt,
      isActive: true,
      youtubeAccountId,
      userId: user.id,
    },
  });

  return NextResponse.json(schedule);
}
