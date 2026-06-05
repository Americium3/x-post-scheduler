"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import UserMenu from "@/components/UserMenu";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const prefix = locale === "zh" ? "/zh" : "";

  const tUser = useTranslations("userMenu");
  const navLinks: { href: string; label: string; highlight?: boolean; indent?: boolean }[] = [
    { href: `${prefix}/dashboard`, label: locale === "zh" ? "仪表盘" : "Dashboard" },
    { href: `${prefix}/chat`, label: tNav("chat"), highlight: true },
    { href: `${prefix}/media-studio`, label: tNav("toolbox") },
    { href: `${prefix}/media-studio/video`, label: tNav("video"), indent: true },
    { href: `${prefix}/media-studio/gallery/generate`, label: tNav("images"), indent: true },
    { href: `${prefix}/media-studio/posts`, label: tNav("posts"), indent: true },
    { href: `${prefix}/media-studio/gallery`, label: tNav("gallery"), indent: true },
    { href: `${prefix}/media-studio/post-production`, label: locale === "zh" ? "后期制作" : "Post Production", indent: true },
    { href: `${prefix}/media-studio/assets`, label: tNav("assets"), indent: true },
    { href: `${prefix}/recurring`, label: tNav("autoPost") },
    { href: `${prefix}/knowledge`, label: tNav("knowledge") },
    { href: `${prefix}/campaigns`, label: tNav("campaigns") },
    { href: `${prefix}/analytics`, label: tNav("analytics") },
    { href: `${prefix}/news`, label: tNav("intelligence"), highlight: true },
    { href: `${prefix}/settings`, label: tUser("settings") },
  ];

  function isActive(href: string) {
    // Strip locale prefix for comparison
    const clean = pathname.replace(/^\/(en|zh)/, "") || "/";
    const hrefClean = href.replace(/^\/(en|zh)/, "") || "/";
    // Exact match for dashboard and media-studio hub
    if (hrefClean === "/dashboard" || hrefClean === "/media-studio") return clean === hrefClean;
    return clean.startsWith(hrefClean);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 lg:flex">
      {/* Sidebar - desktop only */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 bg-white dark:bg-gray-800 shadow-md z-20">
        <div className="px-4 py-5">
          <Link
            href={prefix || "/"}
            className="hover:opacity-80 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark.svg" alt="xPilot" width={140} height={28} style={{ height: 28, width: "auto" }} />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 ${link.indent ? "pl-8 pr-3 py-1.5" : "px-3 py-2"} rounded-lg text-sm transition-all duration-150 ${
                  active
                    ? link.indent
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/20 font-medium"
                      : "bg-gray-900 dark:bg-white/10 text-white dark:text-white font-medium shadow-sm"
                    : link.highlight
                      ? "text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      : link.indent
                        ? "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                {link.indent && (
                  <span className={`w-1 h-1 rounded-full ${active ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
          <UserMenu hideNavigationLinksOnDesktop />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden bg-white dark:bg-gray-800 shadow">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href={prefix || "/"}
            className="hover:opacity-80 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark.svg" alt="xPilot" width={140} height={28} style={{ height: 28, width: "auto" }} />
          </Link>
          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 lg:pl-56">
        {children}
      </div>
    </div>
  );
}
