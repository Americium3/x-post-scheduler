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
  error: string | null;
  duration: number | null;
  aspectRatio: string | null;
  feeCents: number;
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
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setLoading(true); }}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                filter === f.key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  {/* Preview / Icon */}
                  <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {task.outputUrl && task.status === "completed" ? (
                      task.type === "video" ? (
                        <video
                          src={task.outputUrl}
                          className="w-full h-full object-cover rounded-lg"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={task.outputUrl}
                          alt=""
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )
                    ) : (
                      <span className="text-2xl">{task.type === "video" ? "🎬" : "🖼️"}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {isZh ? sc.labelZh : sc.label}
                      </span>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{task.modelLabel}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{task.type === "video" ? "🎬" : "🖼️"}{task.mode ? ` ${task.mode}` : ""}</span>
                      {task.isPublic !== undefined && (
                        <span className={`text-xs ${task.isPublic ? "text-green-500" : "text-gray-400"}`}>
                          {task.isPublic ? (isZh ? "已发布" : "Published") : (isZh ? "未发布" : "Private")}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{timeAgo}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {task.prompt}
                    </p>
                    {task.duration && (
                      <span className="text-xs text-gray-400">{task.duration}s · {task.aspectRatio}</span>
                    )}
                    {task.error && (
                      <p className="text-xs text-red-500 mt-1 truncate">{task.error}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === "completed" && task.outputUrl && (
                      <>
                        <a
                          href={task.outputUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {isZh ? "查看" : "View"}
                        </a>
                        <a
                          href={task.outputUrl}
                          download
                          className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          {isZh ? "下载" : "Download"}
                        </a>
                      </>
                    )}
                    {task.feeCents > 0 && (
                      <span className="text-xs text-gray-400">
                        ${(task.feeCents / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
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
