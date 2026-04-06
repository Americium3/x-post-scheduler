"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";

interface TaskDetail {
  id: string;
  type: string;
  modelId?: string;
  endpointId?: string;
  endpointModel?: string;
  modelLabel: string;
  prompt: string;
  mode: string | null;
  duration: number | null;
  aspectRatio: string | null;
  generateAudio: boolean;
  lockCamera: boolean;
  inputImageUrl: string | null;
  status: string;
  outputUrl: string | null;
  error: string | null;
  feeCents: number;
  isPublic?: boolean;
  mimeType?: string;
  pollAttempts?: number;
  createdAt: string;
  completedAt: string | null;
  source: "task" | "gallery";
}

export default function AssetDetailPage() {
  const locale = useLocale();
  const prefix = locale === "zh" ? "/zh" : "";
  const isZh = locale === "zh";
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/toolbox/tasks/${id}`)
      .then((r) => r.json())
      .then((d) => setItem(d.item ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const statusConfig: Record<string, { label: string; labelZh: string; color: string }> = {
    pending: { label: "Pending", labelZh: "等待中", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
    processing: { label: "Processing", labelZh: "处理中", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    completed: { label: "Completed", labelZh: "已完成", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    failed: { label: "Failed", labelZh: "失败", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link
          href={`${prefix}/media-studio/assets`}
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          {isZh ? "返回素材管理" : "Back to Materials"}
        </Link>

        {loading ? (
          <div className="text-center py-20 text-gray-400">{isZh ? "加载中..." : "Loading..."}</div>
        ) : !item ? (
          <div className="text-center py-20 text-gray-400">{isZh ? "未找到" : "Not found"}</div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[item.status]?.color ?? ""}`}>
                    {isZh ? statusConfig[item.status]?.labelZh : statusConfig[item.status]?.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {item.type === "video" ? "🎬" : "🖼️"} {item.modelLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleString(isZh ? "zh-CN" : "en-US")}
                  {item.completedAt && item.completedAt !== item.createdAt && (
                    <> · {isZh ? "完成于" : "Completed"} {new Date(item.completedAt).toLocaleString(isZh ? "zh-CN" : "en-US")}</>
                  )}
                </p>
              </div>
              {item.feeCents > 0 && (
                <span className="text-sm text-gray-400">${(item.feeCents / 100).toFixed(2)}</span>
              )}
            </div>

            {/* Output preview */}
            {item.outputUrl && (
              <div className="rounded-xl overflow-hidden bg-black">
                {item.type === "video" ? (
                  <video src={item.outputUrl} controls className="w-full" style={{ maxHeight: "60vh" }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.outputUrl} alt="" className="w-full" style={{ maxHeight: "60vh", objectFit: "contain" }} />
                )}
              </div>
            )}

            {/* Actions */}
            {item.outputUrl && (
              <div className="flex gap-2">
                <a
                  href={item.outputUrl}
                  download
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {isZh ? "下载" : "Download"}
                </a>
                <a
                  href={item.outputUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {isZh ? "新窗口打开" : "Open"}
                </a>
                {item.source === "gallery" && item.isPublic === false && (
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/gallery/${item.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isPublic: true }),
                      });
                      if (res.ok) setItem({ ...item, isPublic: true });
                    }}
                    className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    {isZh ? "发布到社区" : "Publish"}
                  </button>
                )}
                {item.source === "gallery" && item.isPublic === true && (
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/gallery/${item.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isPublic: false }),
                      });
                      if (res.ok) setItem({ ...item, isPublic: false });
                    }}
                    className="px-4 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {isZh ? "取消发布" : "Unpublish"}
                  </button>
                )}
              </div>
            )}

            {/* Retry for stuck/failed tasks */}
            {(item.status === "failed" || item.status === "pending" || item.status === "processing") && item.source === "task" && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/toolbox/tasks/${item.id}/retry`, { method: "POST" });
                      if (res.ok) {
                        setItem({ ...item, status: "pending", error: null });
                      }
                    } catch {}
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isZh ? "重新处理" : "Retry"}
                </button>
                {item.status === "processing" && (
                  <span className="flex items-center gap-2 text-sm text-blue-500">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    {isZh ? "处理中..." : "Processing..."}
                  </span>
                )}
              </div>
            )}

            {/* Error */}
            {item.error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{item.error}</p>
              </div>
            )}

            {/* Detail sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prompt */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:col-span-2">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Prompt
                </h3>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {item.prompt || (isZh ? "无" : "None")}
                </p>
              </div>

              {/* Input Image */}
              {item.inputImageUrl && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {isZh ? "输入图片" : "Input Image"}
                  </h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.inputImageUrl}
                    alt="Input"
                    className="w-full rounded-lg"
                    style={{ maxHeight: "300px", objectFit: "contain" }}
                  />
                </div>
              )}

              {/* Parameters */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  {isZh ? "参数" : "Parameters"}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{isZh ? "模型" : "Model"}</dt>
                    <dd className="text-gray-800 dark:text-gray-200 font-medium">{item.modelLabel}</dd>
                  </div>
                  {item.modelId && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{isZh ? "模型 ID" : "Model ID"}</dt>
                      <dd className="text-gray-600 dark:text-gray-400 font-mono text-xs">{item.modelId}</dd>
                    </div>
                  )}
                  {item.endpointId && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{isZh ? "接入点" : "Endpoint"}</dt>
                      <dd className="text-gray-600 dark:text-gray-400 font-mono text-xs">{item.endpointId}</dd>
                    </div>
                  )}
                  {item.endpointModel && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{isZh ? "推理模型" : "Inference Model"}</dt>
                      <dd className="text-gray-600 dark:text-gray-400 font-mono text-xs">{item.endpointModel}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{isZh ? "类型" : "Type"}</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{item.type === "video" ? (isZh ? "视频" : "Video") : (isZh ? "图片" : "Image")}</dd>
                  </div>
                  {item.mode && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{isZh ? "模式" : "Mode"}</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{item.mode}</dd>
                    </div>
                  )}
                  {item.duration && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{isZh ? "时长" : "Duration"}</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{item.duration}s</dd>
                    </div>
                  )}
                  {item.aspectRatio && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{isZh ? "宽高比" : "Aspect Ratio"}</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{item.aspectRatio}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{isZh ? "音频" : "Audio"}</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{item.generateAudio ? (isZh ? "是" : "Yes") : (isZh ? "否" : "No")}</dd>
                  </div>
                  {item.lockCamera && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{isZh ? "锁定镜头" : "Lock Camera"}</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{isZh ? "是" : "Yes"}</dd>
                    </div>
                  )}
                  {item.isPublic !== undefined && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{isZh ? "可见性" : "Visibility"}</dt>
                      <dd className={item.isPublic ? "text-green-600" : "text-gray-400"}>
                        {item.isPublic ? (isZh ? "已发布" : "Published") : (isZh ? "未发布" : "Private")}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
