"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function MediaStudioHub() {
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const prefix = locale === "zh" ? "/zh" : "";

  const sections = [
    {
      href: `${prefix}/media-studio/video`,
      title: tNav("video"),
      description:
        locale === "zh"
          ? "AI 视频生成、视频拼接、长视频任务"
          : "AI video generation, video stitch, long-video jobs",
      icon: "🎬",
    },
    {
      href: `${prefix}/media-studio/gallery/generate`,
      title: tNav("images"),
      description:
        locale === "zh"
          ? "AI 图片生成"
          : "AI image generation",
      icon: "🖼️",
    },
    {
      href: `${prefix}/media-studio/posts`,
      title: tNav("posts"),
      description:
        locale === "zh"
          ? "撰写并调度社交媒体帖子"
          : "Compose and schedule social media posts",
      icon: "✏️",
    },
    {
      href: `${prefix}/media-studio/gallery`,
      title: tNav("gallery"),
      description:
        locale === "zh"
          ? "浏览社区作品、管理已生成的文字、图片和视频"
          : "Browse community works, manage generated text, images & videos",
      icon: "🏛️",
    },
    {
      href: `${prefix}/media-studio/assets`,
      title: tNav("assets"),
      description:
        locale === "zh"
          ? "查看任务进度：处理中、已完成、失败"
          : "Track task progress: processing, completed, failed",
      icon: "📋",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {tNav("toolbox")}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {locale === "zh"
          ? "创作、管理和发布你的多媒体内容"
          : "Create, manage, and publish your multimedia content"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all"
          >
            <span className="text-3xl">{s.icon}</span>
            <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {s.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {s.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
