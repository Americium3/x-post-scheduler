import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getLatestXTweetReport(period: "daily" | "weekly") {
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

async function listXTweetReports(period: "daily" | "weekly", limit: number) {
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

export async function GET() {
  try {
    const [latest, latestWeekly, dailyArchiveRaw] = await Promise.all([
      getLatestXTweetReport("daily"),
      getLatestXTweetReport("weekly"),
      listXTweetReports("daily", 14),
    ]);

    const dailyArchive = dailyArchiveRaw.filter(
      (item) => item.date !== latest?.date,
    );

    return NextResponse.json({
      latest,
      latestWeekly,
      dailyArchive,
    });
  } catch (error) {
    console.error("Error fetching media-x reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
