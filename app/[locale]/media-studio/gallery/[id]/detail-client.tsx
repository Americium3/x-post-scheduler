"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isVerifiedMember } from "@/lib/subscription";
import DashboardShell from "@/components/DashboardShell";

type Lang = "en" | "zh";

type GalleryItem = {
  id: string;
  type: "image" | "video";
  modelId: string;
  modelLabel: string;
  prompt: string;
  blobUrl: string;
  sourceUrl: string;
  inputImageUrl: string | null;
  generationMeta: string | null;
  aspectRatio: string | null;
  mimeType: string;
  isPublic: boolean;
  endpointId?: string;
  endpointModel?: string;
  createdAt: string;
  user?: {
    id?: string;
    name: string | null;
    picture: string | null;
    subscriptionTier?: string | null;
    subscriptionStatus?: string | null;
  };
};

const TEXT = {
  en: {
    title: "Gallery Detail",
    back: "<- Back to Gallery",
    loading: "Loading...",
    failed: "Failed to load item",
    notFound: "Item not found or no access",
    retry: "Retry",
    generated: "Generated Output",
    original: "Original Image",
    process: "Generation Process",
    metadata: "Metadata",
    prompt: "Prompt",
    model: "Model",
    modelId: "Model ID",
    type: "Type",
    aspect: "Aspect Ratio",
    visibility: "Visibility",
    public: "Public",
    private: "Private",
    created: "Created At",
    source: "Source URL",
    stepInput: "Input",
    stepModel: "Model",
    stepOutput: "Output",
    noOriginal: "No original image input",
    author: "Author",
    anonymous: "Anonymous",
  },
  zh: {
    title: "作品详情",
    back: "<- 返回画廊",
    loading: "加载中...",
    failed: "加载详情失败",
    notFound: "作品不存在或无访问权限",
    retry: "重试",
    generated: "生成结果",
    original: "原始图片",
    process: "生成过程",
    metadata: "元数据",
    prompt: "提示词",
    model: "模型",
    modelId: "模型 ID",
    type: "类型",
    aspect: "宽高比",
    visibility: "可见性",
    public: "公开",
    private: "私密",
    created: "创建时间",
    source: "源地址",
    stepInput: "输入",
    stepModel: "模型处理",
    stepOutput: "输出",
    noOriginal: "没有原始图片输入",
    author: "作者",
    anonymous: "匿名用户",
  },
} as const;

/** Strip provider prefix from model ID */
function stripProviderPrefix(modelId: string): string {
  const prefixes = ["wavespeed-ai/", "bytedance/", "alibaba/", "kwaivgi/", "byteplus/", "openrouter/"];
  for (const p of prefixes) {
    if (modelId.startsWith(p)) return modelId.slice(p.length);
  }
  return modelId;
}

/** Strip internal fields (provider info, poll URLs, task IDs) from generation metadata */
function toPrettyJson(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const { provider, pollUrl, taskId, backgroundTask, syncMode, byok, ...visible } = parsed;
      if (Object.keys(visible).length === 0) return null;
      return JSON.stringify(visible, null, 2);
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

export default function GalleryDetailClient({ id }: { id: string }) {
  const [lang, setLang] = useState<Lang>("en");
  const [item, setItem] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const t = TEXT[lang];

  useEffect(() => {
    const saved = localStorage.getItem("app-lang") || localStorage.getItem("gallery-lang");
    if (saved === "zh" || saved === "en") {
      setLang(saved);
      return;
    }
    if (navigator.language.toLowerCase().startsWith("zh")) {
      setLang("zh");
    }
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/gallery/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || t.notFound);
      }
      setItem((data as { item?: GalleryItem }).item ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const generationMetaPretty = useMemo(() => toPrettyJson(item?.generationMeta ?? null), [item?.generationMeta]);

  return (
    <DashboardShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
          </div>
          <Link href="/media-studio/gallery" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            {t.back}
          </Link>
        </div>

        {loading && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-sm text-gray-500">
            {t.loading}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400 space-y-2">
            <p>{error}</p>
            <button
              onClick={() => void load()}
              className="px-3 py-1 rounded border border-red-300 dark:border-red-700 text-xs"
            >
              {t.retry}
            </button>
          </div>
        )}

        {!loading && item && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            {/* Left: Preview + Input */}
            <div className="space-y-4">
              <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t.generated}
                </div>
                <div className="p-4">
                  {item.type === "video" ? (
                    <video src={item.blobUrl} controls className="w-full rounded-lg bg-black" style={{ maxHeight: "65vh" }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.blobUrl} alt={item.prompt} className="w-full rounded-lg" style={{ maxHeight: "65vh", objectFit: "contain" }} />
                  )}
                </div>
              </section>

            </div>

            {/* Right: Metadata sidebar */}
            <div className="space-y-4">

            {/* Author */}
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center gap-3">
                {item.user?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.user.picture}
                    alt={item.user.name ?? ""}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm font-bold">
                    {(item.user?.name ?? "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    {item.user?.name ?? t.anonymous}
                    {isVerifiedMember(
                      item.user?.subscriptionTier,
                      item.user?.subscriptionStatus,
                    ) && (
                      <span
                        className="text-blue-500 font-bold"
                        title={item.user?.subscriptionTier ?? ""}
                      >
                        ✓
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.author}
                    {item.user?.id && (
                      <span className="ml-1 font-mono text-gray-400 dark:text-gray-500">
                        · {item.user.id}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Input image */}
            {item.inputImageUrl && (
              <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t.original}
                </div>
                <div className="p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.inputImageUrl} alt="input" className="w-full rounded-lg" style={{ maxHeight: "200px", objectFit: "contain" }} />
                </div>
              </section>
            )}

            {/* Prompt */}
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t.prompt}</h2>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{item.prompt}</p>
            </section>

            {/* Metadata */}
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t.metadata}</h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">{t.model}</dt>
                  <dd className="text-gray-800 dark:text-gray-200 font-medium text-right">{item.modelLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">{t.modelId}</dt>
                  <dd className="text-gray-600 dark:text-gray-400 font-mono text-xs text-right">{stripProviderPrefix(item.modelId)}</dd>
                </div>
                {item.endpointId && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{lang === "zh" ? "接入点" : "Endpoint"}</dt>
                    <dd className="text-gray-600 dark:text-gray-400 font-mono text-xs text-right">{item.endpointId}</dd>
                  </div>
                )}
                {item.endpointModel && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{lang === "zh" ? "推理模型" : "Inference Model"}</dt>
                    <dd className="text-gray-600 dark:text-gray-400 font-mono text-xs text-right">{item.endpointModel}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">{t.type}</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{item.type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">{t.aspect}</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{item.aspectRatio ?? "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">{t.visibility}</dt>
                  <dd className={item.isPublic ? "text-green-600" : "text-gray-400"}>{item.isPublic ? t.public : t.private}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">{t.created}</dt>
                  <dd className="text-gray-600 dark:text-gray-400 text-xs">{new Date(item.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</dd>
                </div>
              </dl>
            </section>

            {generationMetaPretty && (
              <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Generation Details</h2>
                <pre className="text-xs overflow-x-auto rounded-lg bg-gray-100 dark:bg-gray-900 p-3 text-gray-700 dark:text-gray-200">
                  {generationMetaPretty}
                </pre>
              </section>
            )}

            {/* end right sidebar */}
            </div>
          {/* end grid */}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
