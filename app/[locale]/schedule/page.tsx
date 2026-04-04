"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function SchedulePage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Extract locale from pathname (e.g., /zh/schedule or /schedule)
    const parts = pathname.split("/").filter(Boolean);
    const isZh = parts[0] === "zh";
    const redirectPath = isZh ? "/zh/schedule/x" : "/schedule/x";
    
    router.replace(redirectPath);
  }, [pathname, router]);

  return null;
}
