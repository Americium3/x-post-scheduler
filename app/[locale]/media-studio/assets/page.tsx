"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";

interface MediaTask {
  id: string;
  type: string;
  modelLabel: string;
  prompt: string;
  mode: string | null;
  status: string;
  outputUrl: string | null;
  inputImageUrl?: string | null;
  error: string | null;
  duration: number | null;
  aspectRatio: string | null;
  generateAudio?: boolean;
  feeCents: number;
  pollAttempts?: number;
  createdAt: string;
  completedAt: string | null;
  isPublic?: boolean;
  source?: "task" | "gallery";
}

type FilterStatus = "all" | "processing" | "completed" | "failed";

export default function AssetsPage() {
  const locale = useLocale();
  const prefix = locale === "zh" ? "/zh" : "";
  const isZh = locale === "zh";

  const [tasks, setTasks] = useState<MediaTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/toolbox/tasks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
    // Auto-refresh every 15s for processing tasks
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const statusConfig: Record<string, { label: string; labelZh: string; color: string; dot: string }> = {
    pending: {
      label: "Pending",
      labelZh: "等待中",
      color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      dot: "bg-gray-400",
    },
    processing: {
      label: "Processing",
      labelZh: "处理中",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      dot: "bg-blue-500 animate-pulse",
    },
    completed: {
      label: "Completed",
      labelZh: "已完成",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      dot: "bg-green-500",
    },
    failed: {
      label: "Failed",
      labelZh: "失败",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      dot: "bg-red-500",
    },
  };

  const filters: { key: FilterStatus; label: string; labelZh: string }[] = [
    { key: "all", label: "All", labelZh: "全部" },
    { key: "processing", label: "Processing", labelZh: "处理中" },
    { key: "completed", label: "Completed", labelZh: "已完成" },
    { key: "failed", label: "Failed", labelZh: "失败" },
  ];

  const processingCount = tasks.filter((t) => t.status === "processing" || t.status === "pending").length;

  return (
    <DashboardShell>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {isZh ? "素材管理" : "Materials"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isZh
                ? "查看所有已生成的素材和进行中的任务"
                : "View all generated materials and in-progress tasks"}
            </p>
          </div>
          {processingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-blue-700 dark:text-blue-400">
                {processingCount} {isZh ? "个任务处理中" : "task(s) processing"}
              </span>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto w-fit">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setLoading(true); }}
              className={`px-4 py-1.5 text-sm rounded-lg whitespace-nowrap transition-all duration-150 ${
                filter === f.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {isZh ? f.labelZh : f.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            {isZh ? "加载中..." : "Loading..."}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-gray-400 text-lg">
              {isZh ? "暂无任务" : "No tasks yet"}
            </p>
            <Link
              href={`${prefix}/media-studio/video`}
              className="inline-block px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
            >
              {isZh ? "去创建视频" : "Create a video"}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const sc = statusConfig[task.status] ?? statusConfig.pending;
              const timeAgo = getTimeAgo(task.createdAt, isZh);

              return (
                <Link
                  key={task.id}
                  href={`${prefix}/media-studio/assets/${task.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center shrink-0 overflow-hidden">
                    {task.outputUrl && task.status === "completed" ? (
                      task.type === "video" ? (
                        <video src={task.outputUrl} className="w-full h-full object-cover rounded-xl" muted preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={task.outputUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      )
                    ) : (
                      <span className="text-2xl">{task.type === "video" ? "🎬" : "🖼️"}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {isZh ? sc.labelZh : sc.label}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">{task.modelLabel}</span>
                      <span className="text-[11px] text-gray-400">·</span>
                      <span className="text-[11px] text-gray-400">{timeAgo}</span>
                      <span className="text-[11px] text-gray-300 dark:text-gray-600 font-mono">{task.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {task.prompt}
                    </p>
                    {/* Progress bar for processing tasks */}
                    {(task.status === "processing" || task.status === "pending") && (() => {
                      const elapsed = (Date.now() - new Date(task.createdAt).getTime()) / 1000;
                      const est = getEstimatedSeconds(task.modelLabel, task.duration);
                      const progress = Math.min(95, Math.round((elapsed / est.max) * 100));
                      return (
                        <div className="mt-1.5 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                        </div>
                      );
                    })()}
                    {task.error && <p className="text-[11px] text-red-500 mt-0.5 truncate">{task.error}</p>}
                  </div>

                  {/* Chevron */}
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function getEstimatedSeconds(modelLabel: string, duration: number | null): { min: number; max: number } {
  const label = modelLabel.toLowerCase();
  let minS = 30, maxS = 120;
  if (label.includes("480p") || label.includes("ultra fast")) { minS = 20; maxS = 60; }
  else if (label.includes("720p")) { minS = 40; maxS = 120; }
  else if (label.includes("seedance 2.0")) { minS = 60; maxS = 300; }
  else if (label.includes("seedance")) { minS = 45; maxS = 180; }
  else if (label.includes("kling")) { minS = 60; maxS = 240; }
  else if (label.includes("wan 2.6") || label.includes("wan 2.7")) { minS = 40; maxS = 150; }
  else if (label.includes("ai edit")) { minS = 60; maxS = 180; }
  else if (label.includes("post production")) { minS = 30; maxS = 120; }
  const f = Math.max(1, (duration ?? 5) / 5);
  return { min: Math.round(minS * f), max: Math.round(maxS * f) };
}

function formatDuration(minS: number, maxS: number, isZh: boolean): string {
  const fmt = (s: number) => s < 60 ? (isZh ? `${s}秒` : `${s}s`) : (isZh ? `${Math.round(s / 60)}分钟` : `${Math.round(s / 60)}min`);
  return `${fmt(minS)} - ${fmt(maxS)}`;
}

function getTimeAgo(dateStr: string, isZh: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isZh ? "刚刚" : "just now";
  if (mins < 60) return isZh ? `${mins}分钟前` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isZh ? `${hrs}小时前` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return isZh ? `${days}天前` : `${days}d ago`;
}
