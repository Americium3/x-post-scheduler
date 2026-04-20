"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function RecurringPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    const isZh = parts[0] === "zh";
    const redirectPath = isZh ? "/zh/recurring/x" : "/recurring/x";

    router.replace(redirectPath);
  }, [pathname, router]);

  return null;
}
