import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "X 账号监控日报 | X Accounts Daily | xPilot",
  description:
    "每日汇总监控 X 账号动态，中英双语，洞察行业趋势。Bilingual daily X account monitoring brief.",
};

export const revalidate = 1800; // revalidate every 30 minutes

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, isZh: boolean): string {
  try {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    if (isZh) {
      return d.toLocaleDateString("zh-CN", {
        timeZone: "UTC",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
    }
    return d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

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

// ── page ─────────────────────────────────────────────────────────────────────

export default async function MediaXPage({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale } = await params;
  const isZh = locale === "zh";
  const prefix = isZh ? "/zh" : "";

  const [latest, latestWeekly, dailyArchiveRaw] = await Promise.all([
    getLatestXTweetReport("daily"),
    getLatestXTweetReport("weekly"),
    listXTweetReports("daily", 14),
  ]);

  const dailyArchive = dailyArchiveRaw.filter(
    (item) => item.date !== latest?.date,
  );

  const todayHighlights = isZh
    ? latest?.highlightsZh ?? []
    : latest?.highlightsEn ?? [];
  const weeklyHighlights = isZh
    ? latestWeekly?.highlightsZh ?? []
    : latestWeekly?.highlightsEn ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Masthead ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <Link
              href={prefix || "/"}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              ← {isZh ? "返回首页" : "Back to Home"}
            </Link>
            <Link
              href={`${prefix}/news`}
              className="text-purple-600 dark:text-purple-400 hover:underline text-sm"
            >
              {isZh ? "传媒行业日报 →" : "Media Industry →"}
            </Link>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                {isZh ? "X 账号监控日报" : "X Accounts Daily"}
              </h1>
              <p className="mt-1.5 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                {isZh
                  ? "监控 X 账号动态 · 行业趋势洞察 — 每日双语简报"
                  : "X Account Monitoring · Industry Insights — bilingual, daily"}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {latest?.date && (
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {formatDate(latest.date, isZh)}
                </p>
              )}
              {/* Language toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-1 text-xs font-medium">
                <Link
                  href="/media-x"
                  className={`px-2.5 py-1 rounded-md transition-colors ${!isZh ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                >
                  EN
                </Link>
                <Link
                  href="/zh/media-x"
                  className={`px-2.5 py-1 rounded-md transition-colors ${isZh ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                >
                  中文
                </Link>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="#today"
              className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
            >
              {isZh ? "今日日报" : "Today"}
            </a>
            <a
              href="#archive"
              className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {isZh ? "往期存档" : "Archive"}
            </a>
            <a
              href="#weekly"
              className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60"
            >
              {isZh ? "本周周报" : "Weekly"}
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Today's Daily Brief ──────────────────────────────────── */}
        <section id="today">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              {isZh ? "今日 X 账号日报" : "Today's X Accounts Brief"}
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            {/* Cover */}
            {latest?.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={latest.coverImageUrl}
                alt={isZh ? "今日 X 账号日报配图" : "Today's X accounts brief cover"}
                className="h-48 sm:h-60 w-full object-cover"
              />
            ) : (
              <div className="h-48 sm:h-60 w-full bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white/80 text-4xl font-bold tracking-tight select-none">
                  {isZh ? "X 日报" : "X Daily"}
                </span>
              </div>
            )}

            <div className="p-5 sm:p-6 space-y-5">
              {/* Title & meta */}
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {latest
                    ? isZh
                      ? latest.titleZh
                      : latest.titleEn
                    : isZh
                      ? "今日日报生成中…"
                      : "Today's brief is being prepared…"}
                </h3>
                {latest && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {latest.date} ·{" "}
                    {isZh
                      ? `${latest.sourceCount} 个账号 · ${latest.usedAi ? "AI 汇总" : "规则汇总"}`
                      : `${latest.sourceCount} accounts · ${latest.usedAi ? "AI synthesis" : "Rule-based"}`}
                  </p>
                )}
              </div>

              {/* Bilingual summary */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    中文摘要
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {latest?.summaryZh ?? "正在从监控的 X 账号抓取并汇总最新动态。"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    English Brief
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {latest?.summaryEn ??
                      "Collecting and summarizing latest updates from monitored X accounts."}
                  </p>
                </div>
              </div>

              {/* Highlights */}
              {todayHighlights.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">
                    {isZh ? "关键洞察" : "Key Insights"}
                  </p>
                  <ol className="space-y-2">
                    {todayHighlights.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {!latest && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {isZh
                    ? "今日数据尚未入库，等待每日定时任务写入后自动展示。"
                    : "No stored report yet. The page updates automatically after the daily cron job runs."}
                </p>
              )}
            </div>
          </div>
        </section>

        

        {/* ── Weekly Report ────────────────────────────────────────── */}
        {latestWeekly && (
          <section id="weekly">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {isZh ? "本周周报" : "This Week's Report"}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isZh
                  ? `周起始 ${latestWeekly.date}`
                  : `Week of ${latestWeekly.date}`}
              </span>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 sm:p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isZh ? latestWeekly.titleZh : latestWeekly.titleEn}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {isZh ? latestWeekly.summaryZh : latestWeekly.summaryEn}
              </p>
              {weeklyHighlights.length > 0 && (
                <ol className="space-y-2">
                  {weeklyHighlights.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-xs text-gray-400">
                {isZh
                  ? `${latestWeekly.sourceCount} 个账号 · ${latestWeekly.usedAi ? "AI 汇总" : "规则汇总"}`
                  : `${latestWeekly.sourceCount} accounts · ${latestWeekly.usedAi ? "AI synthesis" : "Rule-based"}`}
              </p>
            </div>
          </section>
        )}

        {/* ── Archive ──────────────────────────────────────────────── */}
        <section id="archive">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
            {isZh ? "往期存档" : "Archive"}
          </h2>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
            {dailyArchive.length > 0 ? (
              <ul className="space-y-2">
                {dailyArchive.slice(0, 14).map((item) => (
                  <li key={`d-${item.date}`} className="text-sm">
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0 font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                        {item.date}
                      </span>
                      <span className="mx-0.5 text-gray-300 dark:text-gray-600">
                        ·
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 line-clamp-1">
                        {isZh ? item.titleZh : item.titleEn}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isZh ? "暂无往期日报。" : "No archived daily reports yet."}
              </p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
