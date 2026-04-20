"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { VIDEO_MODELS } from "@/components/toolbox/constants";
import DashboardShell from "@/components/DashboardShell";

const ASPECT_RATIOS = [
  { label: "16:9 横版", value: "16:9" },
  { label: "9:16 竖版", value: "9:16" },
  { label: "1:1 正方", value: "1:1" },
];

interface Trend {
  name: string;
  url?: string;
  description?: string;
}

interface Schedule {
  id: string;
  aiPrompt: string | null;
  aiLanguage: string | null;
  trendRegion: string | null;
  model: string | null;
  aspectRatio: string | null;
  duration: number | null;
  frequency: string;
  cronExpr: string;
  nextRunAt: string;
  isActive: boolean;
}

export default function RecurringYouTubePage() {
  const t = useTranslations("recurring");
  const locale = useLocale();
  const prefix = locale === "zh" ? "/zh" : "";
  const router = useRouter();

  const [balanceCents, setBalanceCents] = useState(0);
  const [recurringUsage, setRecurringUsage] = useState({
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  });
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; label: string | null; username: string | null; isDefault: boolean }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLanguage, setAiLanguage] = useState("");
  const [textModelId, setTextModelId] = useState(VIDEO_MODELS[0].id);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(5);
  const [trendRegion, setTrendRegion] = useState<"" | "global" | "usa" | "china" | "africa">("");
  const [canUseTrending, setCanUseTrending] = useState(false);
  const [trendPreview, setTrendPreview] = useState<Trend[]>([]);
  const [trendPreviewLoading, setTrendPreviewLoading] = useState(false);
  const [trendPreviewError, setTrendPreviewError] = useState("");
  const [trendSummary, setTrendSummary] = useState("");
  const [videoSampleUrl, setVideoSampleUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [time, setTime] = useState("09:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editAiPrompt, setEditAiPrompt] = useState("");
  const [editAiLanguage, setEditAiLanguage] = useState("");
  const [editTextModelId, setEditTextModelId] = useState(VIDEO_MODELS[0].id);
  const [editAspectRatio, setEditAspectRatio] = useState("16:9");
  const [editDuration, setEditDuration] = useState(5);
  const [editTrendRegion, setEditTrendRegion] = useState<"" | "global" | "usa" | "china" | "africa">("");
  const [editFrequency, setEditFrequency] = useState<"daily" | "weekly">("daily");
  const [editTime, setEditTime] = useState("09:00");
  const [updatingScheduleId, setUpdatingScheduleId] = useState<string | null>(null);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    void fetchAccounts();
    void fetchSchedules();
    setCanUseTrending(true);
  }, []);

  const fetchSchedules = async () => {
    const res = await fetch("/api/recurring/youtube");
    if (!res.ok) return;
    const data = await res.json();
    setSchedules(data.schedules || []);
    setBalanceCents(Number(data.balanceCents ?? 0));
    setRecurringUsage({
      requests: Number(data.usage?.requests ?? 0),
      promptTokens: Number(data.usage?.promptTokens ?? 0),
      completionTokens: Number(data.usage?.completionTokens ?? 0),
      totalTokens: Number(data.usage?.totalTokens ?? 0),
    });
  };

  const fetchAccounts = async () => {
    const res = await fetch("/api/settings/youtube");
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data.youtubeAccounts) ? data.youtubeAccounts : [];
    const mapped = list.map((acc: { id: string; channelTitle: string; channelId: string; isDefault: boolean }) => ({
      id: acc.id,
      label: acc.channelTitle,
      username: acc.channelId,
      isDefault: acc.isDefault,
    }));
    setAccounts(mapped);
    if (mapped.length > 0) {
      const defaultAccount = mapped.find((a: { isDefault: boolean }) => a.isDefault) ?? mapped[0];
      setSelectedAccountId(defaultAccount.id);
    }
  };

  const fetchTrendPreview = async (region: string) => {
    if (!region) {
      setTrendPreview([]);
      setTrendPreviewError("");
      setTrendSummary("");
      return;
    }
    setTrendPreviewLoading(true);
    setTrendPreviewError("");
    setTrendPreview([]);
    setTrendSummary("");
    try {
      const res = await fetch(`/api/trending?region=${region}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTrendPreviewError(data.error || `HTTP ${res.status}`);
      } else {
        const allTrends = data.trends ?? [];
        const randomTrends = allTrends
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        setTrendPreview(randomTrends);

        // Generate AI summary for the trends
        if (randomTrends.length > 0) {
          void generateTrendSummary(randomTrends);
        }
      }
    } catch (e) {
      setTrendPreviewError(
        e instanceof Error ? e.message : "Failed to fetch trends"
      );
    } finally {
      setTrendPreviewLoading(false);
    }
  };

  const generateTrendSummary = async (trends: Trend[]) => {
    try {
      const summaryRes = await fetch("/api/trending/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trends }),
      });

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        const language = aiLanguage || "en";
        const title = language === "zh" ? summaryData.titleZh : summaryData.titleEn;
        const summary = language === "zh" ? summaryData.summaryZh : summaryData.summaryEn;
        setTrendSummary(`${title}: ${summary}`);
      }
    } catch (e) {
      console.error("Failed to generate summary:", e);
    }
  };

  const generateSample = async () => {
    if (trendPreview.length === 0) return;

    setIsGeneratingVideo(true);
    setVideoError("");
    setVideoSampleUrl(null);

    try {
      // Fetch AI summary using the same approach as generateTrendSummary
      const summaryRes = await fetch("/api/trending/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trends: trendPreview }),
      });

      let prompt: string;
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        const language = aiLanguage || "en";
        const title = language === "zh" ? summaryData.titleZh : summaryData.titleEn;
        const summary = language === "zh" ? summaryData.summaryZh : summaryData.summaryEn;

        // Build prompt with summary, language, aspect ratio, duration
        const languageText = language === "zh" ? "中文" : "English";
        prompt = `${title}: ${summary}. Language: ${languageText}, Aspect Ratio: ${aspectRatio}, Duration: ${duration}s`.slice(0, 200);

        // Update display summary
        setTrendSummary(`${title}: ${summary}`);
      } else {
        // Fallback if summary generation fails
        const trendNames = trendPreview.map(t => t.name).join(", ");
        const languageText = aiLanguage === "zh" ? "中文" : "English";
        prompt = `Create a video about: ${trendNames}. Language: ${languageText}, Aspect Ratio: ${aspectRatio}, Duration: ${duration}s`.slice(0, 200);
        setTrendSummary(prompt);
      }

      const videoRes = await fetch("/api/toolbox/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: textModelId,
          prompt,
          duration: duration,
          aspectRatio: aspectRatio,
        }),
      });
      const videoData = await videoRes.json();
      if (!videoRes.ok) throw new Error(videoData.error);

      const taskId = videoData.task.id;
      const pollUrl = videoData.task?.urls?.get;

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollRes = await fetch(`/api/toolbox/video?taskId=${encodeURIComponent(pollUrl ?? taskId)}`);
        const pollData = await pollRes.json();
        if (!pollRes.ok) throw new Error(pollData.error);

        if (pollData.task.status === "completed") {
          setVideoSampleUrl(pollData.task.outputs?.[0] ?? null);
          break;
        } else if (pollData.task.status === "failed") {
          throw new Error(pollData.task.error ?? "Video generation failed");
        }
      }
    } catch (e) {
      setVideoError(e instanceof Error ? e.message : "Failed to generate sample");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedAccountId) {
      setError(t("errorAccount"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/recurring/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiPrompt: aiPrompt || undefined,
          aiLanguage: aiLanguage || undefined,
          model: textModelId || undefined,
          aspectRatio: aspectRatio || undefined,
          duration: duration || undefined,
          trendRegion: trendRegion || undefined,
          youtubeAccountId: selectedAccountId,
          frequency,
          cronExpr: time,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create schedule");
      }

      setAiPrompt("");
      setAiLanguage("");
      setTextModelId(VIDEO_MODELS[0].id);
      setAspectRatio("16:9");
      setDuration(5);
      setTrendRegion("");
      setTrendPreview([]);
      setTrendSummary("");
      setVideoSampleUrl(null);
      await fetchSchedules();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (schedule: Schedule) => {
    setEditError("");
    setEditingScheduleId(schedule.id);
    setEditAiPrompt(schedule.aiPrompt || "");
    setEditAiLanguage(schedule.aiLanguage || "");
    setEditTextModelId(schedule.model || VIDEO_MODELS[0].id);
    setEditAspectRatio(schedule.aspectRatio || "16:9");
    setEditDuration(schedule.duration || 5);
    setEditTrendRegion((schedule.trendRegion as "" | "global" | "usa" | "china" | "africa") || "");
    setEditFrequency(schedule.frequency as "daily" | "weekly");
    setEditTime(schedule.cronExpr);
  };

  const handleCancelEdit = () => {
    setEditingScheduleId(null);
    setEditError("");
  };

  const handleUpdate = async (scheduleId: string) => {
    setEditError("");
    setUpdatingScheduleId(scheduleId);
    try {
      const res = await fetch(`/api/recurring/youtube/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiPrompt: editAiPrompt || undefined,
          aiLanguage: editAiLanguage || undefined,
          model: editTextModelId || undefined,
          aspectRatio: editAspectRatio || undefined,
          duration: editDuration || undefined,
          trendRegion: editTrendRegion || undefined,
          frequency: editFrequency,
          cronExpr: editTime,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update schedule");
      }
      await fetchSchedules();
      handleCancelEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingScheduleId(null);
    }
  };

  const handleToggle = async (scheduleId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/recurring/youtube/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle schedule");
      await fetchSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      const res = await fetch(`/api/recurring/youtube/${scheduleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      await fetchSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardShell>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t("title")} - YouTube
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <Link
                    href={`${prefix}/recurring/x`}
                    className="px-3 py-1.5 rounded-lg font-medium transition-colors text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    X
                  </Link>
                  <button
                    className="px-3 py-1.5 rounded-lg font-medium transition-colors text-sm bg-red-600 hover:bg-red-700 text-white"
                  >
                    YouTube
                  </button>
                </div>
                <Link
                  href={`${prefix}/dashboard`}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  {t("backToDashboard")}
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("currentBalance")}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white break-all">
                ${(balanceCents / 100).toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("tokenUsage")}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {recurringUsage.totalTokens.toLocaleString()} {t("tokens")}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {recurringUsage.requests.toLocaleString()} {t("requests")}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("createTitle")}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  YouTube Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {accounts.length === 0 && <option value="">{t("noAccount")}</option>}
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {(account.label || account.username || "Unnamed account") + (account.isDefault ? " (Default)" : "")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Prompt
                </label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="e.g., Create a video about AI technology trends..."
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  AI will combine this prompt with news to generate video content
                </p>
              </div>

              {/* Trending Region */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🔥 Auto Trending News
                  {!canUseTrending && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Silver+
                    </span>
                  )}
                </label>
                {!canUseTrending ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    🔒 Upgrade to{" "}
                    <a
                      href="/settings"
                      className="text-blue-600 dark:text-blue-400 underline"
                    >
                      Silver or above
                    </a>{" "}
                    to auto-generate posts from trending news.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {(["", "global", "usa", "china", "africa"] as const).map(
                        (r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setTrendRegion(r);
                              void fetchTrendPreview(r);
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${trendRegion === r
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                              }`}
                          >
                            {r === ""
                              ? "Off"
                              : r === "global"
                                ? "🌍 Global"
                                : r === "usa"
                                  ? "🇺🇸 USA"
                                  : r === "china"
                                    ? "🇨🇳 China"
                                    : "🌍 Africa"}
                          </button>
                        ),
                      )}
                      {trendRegion && (
                        <button
                          type="button"
                          onClick={() => void fetchTrendPreview(trendRegion)}
                          className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        >
                          ↻ Refresh
                        </button>
                      )}
                    </div>
                    {trendRegion && (
                      <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400">
                        Each run will fetch today&apos;s top 3 news from{" "}
                        {trendRegion === "global"
                          ? "Global"
                          : trendRegion.toUpperCase()}{" "}
                        and generate video content connecting them to your topic.
                      </p>
                    )}

                    {/* Trending preview list */}
                    {trendRegion && (
                      <div className="mt-2">
                        {trendPreviewLoading && (
                          <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
                            <svg
                              className="animate-spin h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Loading trending topics...
                          </div>
                        )}
                        {trendPreviewError && (
                          <p className="text-xs text-red-500 dark:text-red-400 py-1">
                            ❌ {trendPreviewError}
                          </p>
                        )}
                        {!trendPreviewLoading && trendPreview.length > 0 && (
                          <div className="space-y-1.5 mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {trendPreview.length} current trending topics:
                            </p>
                            {trendPreview.map((trend, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
                              >
                                <span className="text-xs font-mono text-gray-400 mt-0.5 w-4 shrink-0">
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 dark:text-white leading-snug">
                                    {trend.name}
                                  </p>
                                  {trend.description && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {trend.description}
                                    </p>
                                  )}
                                </div>
                                {trend.url && (
                                  <a
                                    href={trend.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:underline shrink-0"
                                  >
                                    ↗
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* AI Summary Display */}
                        {trendSummary && (
                          <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-lg">🤖</span>
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                                  AI-Generated Summary
                                </p>
                                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                  {trendSummary}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label
                  htmlFor="aiLanguage"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t("aiLanguage")}
                </label>
                <input
                  type="text"
                  id="aiLanguage"
                  value={aiLanguage}
                  onChange={(e) => setAiLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t("aiLanguagePlaceholder")}
                />
              </div>

              <div>
                <label
                  htmlFor="textModelId"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Video Model
                </label>
                <select
                  id="textModelId"
                  value={textModelId}
                  onChange={(e) => setTextModelId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {VIDEO_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Aspect Ratio
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {ASPECT_RATIOS.map((ar) => (
                      <option key={ar.value} value={ar.value}>
                        {ar.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (seconds)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {VIDEO_MODELS.find(m => m.id === textModelId)?.durations?.map((d) => (
                      <option key={d} value={d}>
                        {d}s
                      </option>
                    )) || <option value={5}>5s</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("frequency")}
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="daily">{t("daily")}</option>
                    <option value="weekly">{t("weekly")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("time")}
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={generateSample}
                  disabled={isGeneratingVideo || !trendRegion}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isGeneratingVideo ? "Generating..." : "Generate Sample"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isSubmitting ? t("saving") : t("saveTask")}
                </button>
              </div>

              {videoError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{videoError}</p>
                </div>
              )}

              {videoSampleUrl && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Video Preview:
                  </p>
                  <video
                    src={videoSampleUrl}
                    controls
                    className="w-full rounded-lg"
                  />
                </div>
              )}
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("yourSchedules")}
              </h2>
            </div>
            <div className="p-6">
              {schedules.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">
                  {t("noSchedules")}
                </p>
              ) : (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="p-4 flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {schedule.frequency === "daily" ? "Daily" : "Weekly"} at {schedule.cronExpr}
                            </p>
                            <span className={`px-2 py-1 text-xs rounded ${schedule.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800"}`}>
                              {schedule.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {schedule.aiPrompt && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {schedule.aiPrompt}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {schedule.model && <span>Model: {VIDEO_MODELS.find(m => m.id === schedule.model)?.label || schedule.model}</span>}
                            {schedule.aspectRatio && <span>• {schedule.aspectRatio}</span>}
                            {schedule.duration && <span>• {schedule.duration}s</span>}
                            {schedule.trendRegion && <span>• Trending: {schedule.trendRegion}</span>}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Next run: {new Date(schedule.nextRunAt).toLocaleString()}
                          </p>

                          {editingScheduleId === schedule.id && (
                            <div className="mt-3 border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3 bg-gray-50 dark:bg-gray-700/40">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                  AI Prompt
                                </label>
                                <textarea
                                  rows={3}
                                  value={editAiPrompt}
                                  onChange={(e) => setEditAiPrompt(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                  Video Model
                                </label>
                                <select
                                  value={editTextModelId}
                                  onChange={(e) => setEditTextModelId(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                  {VIDEO_MODELS.map((model) => (
                                    <option key={model.id} value={model.id}>
                                      {model.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    Aspect Ratio
                                  </label>
                                  <select
                                    value={editAspectRatio}
                                    onChange={(e) => setEditAspectRatio(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  >
                                    {ASPECT_RATIOS.map((ar) => (
                                      <option key={ar.value} value={ar.value}>
                                        {ar.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    Duration
                                  </label>
                                  <select
                                    value={editDuration}
                                    onChange={(e) => setEditDuration(Number(e.target.value))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  >
                                    {VIDEO_MODELS.find(m => m.id === editTextModelId)?.durations?.map((d) => (
                                      <option key={d} value={d}>
                                        {d}s
                                      </option>
                                    )) || <option value={5}>5s</option>}
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    {t("frequency")}
                                  </label>
                                  <select
                                    value={editFrequency}
                                    onChange={(e) => setEditFrequency(e.target.value as "daily" | "weekly")}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  >
                                    <option value="daily">{t("daily")}</option>
                                    <option value="weekly">{t("weekly")}</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    {t("time")}
                                  </label>
                                  <input
                                    type="time"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  />
                                </div>
                              </div>
                              {editError && (
                                <p className="text-sm text-red-600 dark:text-red-400">
                                  {editError}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdate(schedule.id)}
                                  disabled={updatingScheduleId === schedule.id}
                                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {updatingScheduleId === schedule.id ? t("saving") : t("save")}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={updatingScheduleId === schedule.id}
                                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  {t("cancel")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 shrink-0 ml-4">
                          <button
                            onClick={() => editingScheduleId === schedule.id ? handleCancelEdit() : handleStartEdit(schedule)}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {editingScheduleId === schedule.id ? t("closeEdit") : t("edit")}
                          </button>
                          <button
                            onClick={() => handleToggle(schedule.id, schedule.isActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${schedule.isActive ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                              }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${schedule.isActive ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            {t("delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </DashboardShell>
  );
}
