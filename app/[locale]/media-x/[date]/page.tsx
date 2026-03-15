import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getXReportByDate, listStoredXReports } from "@/lib/media-x";

export const revalidate = 1800;

type Props = {
  params: Promise<{ locale?: string; date: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, date } = await params;
  const isZh = locale === "zh";
  const report = await getXReportByDate(date, "daily");
  if (!report) return {};

  const title = isZh
    ? `${report.titleZh} | X 账号日报 | xPilot`
    : `${report.titleEn} | X Accounts Daily | xPilot`;
  const description = isZh
    ? report.summaryZh.slice(0, 160)
    : report.summaryEn.slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(report.coverImageUrl ? { images: [report.coverImageUrl] } : {}),
    },
    alternates: {
      canonical: `/${isZh ? "zh" : "en"}/media-x/${date}`,
      languages: {
        "zh-CN": `/zh/media-x/${date}`,
        "en-US": `/en/media-x/${date}`,
      },
    },
  };
}

export async function generateStaticParams() {
  const reports = await listStoredXReports("daily", 30);
  return reports.map((r) => ({ date: r.date }));
}

export default async function MediaXReportPage({ params }: Props) {
  const { locale, date } = await params;
  const isZh = locale === "zh";
  const prefix = isZh ? "/zh" : "";

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const report = await getXReportByDate(date, "daily");
  if (!report) notFound();

  const highlights = isZh ? report.highlightsZh : report.highlightsEn;
  const title = isZh ? report.titleZh : report.titleEn;

  const formattedDate = (() => {
    try {
      const d = new Date(`${date}T00:00:00.000Z`);
      return isZh
        ? d.toLocaleDateString("zh-CN", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric", weekday: "long" })
        : d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch {
      return date;
    }
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb + language toggle */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href={prefix || "/"} className="hover:text-gray-700 dark:hover:text-gray-200">
              {isZh ? "首页" : "Home"}
            </Link>
            <span>/</span>
            <Link href={`${prefix}/news`} className="hover:text-gray-700 dark:hover:text-gray-200">
              {isZh ? "情报中心" : "Intelligence"}
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-mono">{date}</span>
          </nav>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-1 text-xs font-medium">
            <Link
              href={`/media-x/${date}`}
              className={`px-2.5 py-1 rounded-md transition-colors ${!isZh ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              EN
            </Link>
            <Link
              href={`/zh/media-x/${date}`}
              className={`px-2.5 py-1 rounded-md transition-colors ${isZh ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              中文
            </Link>
          </div>
        </div>

        <article className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          {/* Cover */}
          {report.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={report.coverImageUrl}
              alt={title}
              className="h-48 sm:h-64 w-full object-cover"
            />
          ) : (
            <div className="h-48 sm:h-64 w-full bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white/80 text-4xl font-bold tracking-tight select-none">
                {isZh ? "X 日报" : "X Daily"}
              </span>
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-6">
            {/* Meta */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                {isZh ? "X 账号日报" : "X Accounts Daily"}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-snug">
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {formattedDate}
                <span className="mx-2">·</span>
                {isZh
                  ? `${report.sourceCount} 个账号`
                  : `${report.sourceCount} accounts`}
              </p>
            </div>

            {/* Bilingual summary */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">中文摘要</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{report.summaryZh}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">English Brief</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{report.summaryEn}</p>
              </div>
            </div>

            {/* Highlights */}
            {highlights.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">
                  {isZh ? "关键洞察" : "Key Insights"}
                </p>
                <ol className="space-y-3">
                  {highlights.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Both-language highlights if viewing one */}
            {highlights === report.highlightsZh && report.highlightsEn.length > 0 && (
              <details className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <summary className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                  English Highlights
                </summary>
                <ol className="space-y-2 px-4 pb-4">
                  {report.highlightsEn.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {highlights === report.highlightsEn && report.highlightsZh.length > 0 && (
              <details className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <summary className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                  中文要点
                </summary>
                <ol className="space-y-2 px-4 pb-4">
                  {report.highlightsZh.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </article>

        {/* Back link */}
        <div className="mt-6">
          <Link
            href={`${prefix}/news`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← {isZh ? "返回情报中心" : "Back to Intelligence"}
          </Link>
        </div>
      </div>
    </div>
  );
}
