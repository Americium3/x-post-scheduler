"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import DashboardShell from "@/components/DashboardShell";

export default function MediaStudioHub() {
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const prefix = locale === "zh" ? "/zh" : "";
  const isZh = locale === "zh";

  const sections = [
    {
      href: `${prefix}/media-studio/video`,
      title: tNav("video"),
      description: isZh
        ? "AI 视频生成、视频拼接、长视频任务"
        : "AI video generation, video stitch, long-video jobs",
      icon: "🎬",
      gradient: "from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20",
      border: "hover:border-violet-400 dark:hover:border-violet-500",
      iconBg: "bg-violet-100 dark:bg-violet-900/40",
    },
    {
      href: `${prefix}/media-studio/gallery/generate`,
      title: tNav("images"),
      description: isZh ? "AI 图片生成" : "AI image generation",
      icon: "🖼️",
      gradient: "from-sky-500/10 to-blue-500/10 dark:from-sky-500/20 dark:to-blue-500/20",
      border: "hover:border-sky-400 dark:hover:border-sky-500",
      iconBg: "bg-sky-100 dark:bg-sky-900/40",
    },
    {
      href: `${prefix}/media-studio/posts`,
      title: tNav("posts"),
      description: isZh
        ? "撰写并调度社交媒体帖子"
        : "Compose and schedule social media posts",
      icon: "✏️",
      gradient: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
      border: "hover:border-amber-400 dark:hover:border-amber-500",
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
    },
    {
      href: `${prefix}/media-studio/post-production`,
      title: isZh ? "后期制作" : "Post Production",
      description: isZh
        ? "文字叠加、智能遮罩、AI 跟踪"
        : "Text overlay, smart masking, AI tracking",
      icon: "🎨",
      gradient: "from-rose-500/10 to-pink-500/10 dark:from-rose-500/20 dark:to-pink-500/20",
      border: "hover:border-rose-400 dark:hover:border-rose-500",
      iconBg: "bg-rose-100 dark:bg-rose-900/40",
    },
    {
      href: `${prefix}/media-studio/gallery`,
      title: tNav("gallery"),
      description: isZh
        ? "浏览社区作品、管理已生成的图片和视频"
        : "Browse community works, manage generated media",
      icon: "🏛️",
      gradient: "from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20",
      border: "hover:border-emerald-400 dark:hover:border-emerald-500",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    },
    {
      href: `${prefix}/media-studio/assets`,
      title: tNav("assets"),
      description: isZh
        ? "查看任务进度：处理中、已完成、失败"
        : "Track task progress: processing, completed, failed",
      icon: "📋",
      gradient: "from-slate-500/10 to-gray-500/10 dark:from-slate-500/20 dark:to-gray-500/20",
      border: "hover:border-slate-400 dark:hover:border-slate-500",
      iconBg: "bg-slate-100 dark:bg-slate-900/40",
    },
  ];

  return (
    <DashboardShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {tNav("toolbox")}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            {isZh
              ? "创作、管理和发布你的多媒体内容"
              : "Create, manage, and publish your multimedia content"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`group relative block rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-gradient-to-br ${s.gradient} p-5 sm:p-6 ${s.border} hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200`}
            >
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${s.iconBg} text-xl`}>
                {s.icon}
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-100 transition-colors">
                {s.title}
              </h2>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {s.description}
              </p>
              <div className="mt-4 flex items-center text-xs font-medium text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                {isZh ? "进入" : "Open"}
                <svg className="ml-1 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
