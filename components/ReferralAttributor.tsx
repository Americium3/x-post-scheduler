"use client";

import { useEffect } from "react";

export default function ReferralAttributor() {
  useEffect(() => {
    const refCode = localStorage.getItem("xpilot_referral_code");
    if (!refCode) return;

    fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refCode }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          localStorage.removeItem("xpilot_referral_code");
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
