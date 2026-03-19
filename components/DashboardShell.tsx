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

  const navLinks = [
    { href: `${prefix}/dashboard`, label: locale === "zh" ? "仪表盘" : "Dashboard" },
    { href: `${prefix}/gallery`, label: tNav("gallery") },
    { href: `${prefix}/toolbox`, label: tNav("toolbox") },
    { href: `${prefix}/schedule`, label: tNav("compose") },
    { href: `${prefix}/recurring`, label: tNav("autoPost") },
    { href: `${prefix}/knowledge`, label: tNav("knowledge") },
    { href: `${prefix}/campaigns`, label: tNav("campaigns") },
    { href: `${prefix}/analytics`, label: tNav("analytics") },
    { href: `${prefix}/news`, label: tNav("intelligence"), highlight: true },
  ];

  function isActive(href: string) {
    // Strip locale prefix for comparison
    const clean = pathname.replace(/^\/(en|zh)/, "") || "/";
    const hrefClean = href.replace(/^\/(en|zh)/, "") || "/";
    // Exact match for dashboard, prefix match for others
    if (hrefClean === "/dashboard") return clean === "/dashboard";
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
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2 rounded-md text-sm ${
                isActive(link.href)
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                  : link.highlight
                    ? "text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {link.label}
            </Link>
          ))}
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
