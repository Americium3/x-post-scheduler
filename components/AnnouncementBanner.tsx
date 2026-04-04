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
    badge: "公告",
    title: "存储迁移完成 + $10 补偿点数已到账",
    description: "我们已将文件存储迁移至 Cloudflare R2，2 月 21 日至 3 月 28 日期间部分素材因临时链接过期而丢失。为表歉意，已为每位用户赠送 $10 平台点数。您的新素材现已安全存储，不会再出现类似问题。",
    cta: "查看详情",
  } : {
    badge: "NOTICE",
    title: "Storage Migration Complete + $10 Credit Compensation",
    description: "We migrated file storage to Cloudflare R2. Some media from Feb 21 \u2013 Mar 28 was lost due to expired temporary links. $10 in credits has been added to your account as compensation. Your media is now securely stored.",
    cta: "Learn More",
  };

  return (
    <div className="relative mb-6 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800 px-4 py-3 sm:px-6 sm:py-4">
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
        <span className="inline-flex items-center self-start rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-bold text-white">
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
          href={`${prefix}/changelog`}
          className="self-start sm:self-center shrink-0 rounded-md bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
        >
          {content.cta}
        </Link>
      </div>
    </div>
  );
}
