"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

export default function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  const locale = useLocale();
  const prefix = locale === "zh" ? "/zh" : "";

  if (dismissed) return null;

  const content = locale === "zh" ? {
    badge: "新功能",
    title: "xPilot 现已支持 MCP 协议",
    description: "通过 MCP (Model Context Protocol) 直接在 Claude Desktop、Claude Code 等 AI 工具中调用 xPilot 的图片、视频、文案生成能力。使用您的 API Key 即可连接。",
    cta: "查看文档",
  } : {
    badge: "NEW",
    title: "xPilot Now Supports MCP Protocol",
    description: "Use xPilot directly from Claude Desktop, Claude Code, and other AI tools via MCP (Model Context Protocol). Generate images, videos, and posts without leaving your AI workflow.",
    cta: "View Docs",
  };

  return (
    <div className="relative mb-6 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800 px-4 py-3 sm:px-6 sm:py-4">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="inline-flex items-center self-start rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
          {content.badge}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {content.title}
          </p>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {content.description}
          </p>
        </div>
        <Link
          href={`${prefix}/docs/mcp`}
          className="self-start sm:self-center shrink-0 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {content.cta}
        </Link>
      </div>
    </div>
  );
}
