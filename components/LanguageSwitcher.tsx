"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect, useTransition } from "react";

const LOCALES = [
  { code: "en", label: "English", flag: "EN" },
  { code: "zh", label: "中文", flag: "中" },
  { code: "es", label: "Español", flag: "ES" },
  { code: "ja", label: "日本語", flag: "JA" },
  { code: "ko", label: "한국어", flag: "KO" },
];

export default function LanguageSwitcher({
  className,
}: {
  className?: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function switchTo(code: string) {
    if (code === locale) { setIsOpen(false); return; }
    // Strip existing locale prefix
    const localePattern = /^\/(en|zh|es|ja|ko)/;
    const pathWithoutLocale = pathname.replace(localePattern, "") || "/";
    const newPath = code === "en" ? pathWithoutLocale : `/${code}${pathWithoutLocale}`;
    // Persist preference
    void fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: code }),
    });
    setIsOpen(false);
    startTransition(() => { router.push(newPath); });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={
          className ||
          "text-sm text-gray-700 dark:text-gray-200 hover:underline underline-offset-4 disabled:opacity-50 font-medium"
        }
      >
        {current.flag} {current.label}
      </button>
      {isOpen && (
        <div className="absolute bottom-full mb-1 left-0 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => switchTo(l.code)}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                l.code === locale
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
