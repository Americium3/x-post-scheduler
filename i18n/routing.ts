import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh", "es", "ja", "ko"],
  defaultLocale: "en",
  localePrefix: "as-needed", // /dashboard for en, /zh/dashboard for zh
});
