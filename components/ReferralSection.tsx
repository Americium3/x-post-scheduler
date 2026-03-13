"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

interface Commission {
  id: string;
  sourceType: string;
  sourceAmountCents: number;
  commissionCents: number;
  createdAt: string;
}

interface ReferralStats {
  referralCode: string | null;
  totalReferred: number;
  totalEarnedCents: number;
  recentCommissions: Commission[];
}

export default function ReferralSection({ locale }: { locale: string }) {
  const isZh = locale === "zh";
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setStats(data);
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    if (!stats?.referralCode) return;
    const link = `${window.location.origin}/?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  const referralLink = stats?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${stats.referralCode}`
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isZh ? "推荐计划" : "Referral Program"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isZh
            ? "邀请好友注册，获得其所有消费 5% 的终身佣金"
            : "Invite friends and earn 5% lifetime commission on all their purchases"}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Referral Link */}
        {stats?.referralCode ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isZh ? "你的推荐链接" : "Your Referral Link"}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={referralLink || ""}
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
              />
              <button
                onClick={copyLink}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
              >
                {copied
                  ? isZh
                    ? "已复制!"
                    : "Copied!"
                  : isZh
                    ? "复制"
                    : "Copy"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generateCode}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generating
              ? isZh
                ? "生成中..."
                : "Generating..."
              : isZh
                ? "生成推荐链接"
                : "Generate Referral Link"}
          </button>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isZh ? "已推荐用户" : "Users Referred"}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats?.totalReferred ?? 0}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isZh ? "累计佣金" : "Total Earned"}
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              ${((stats?.totalEarnedCents ?? 0) / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Recent Commissions */}
        {stats?.recentCommissions && stats.recentCommissions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {isZh ? "近期佣金" : "Recent Commissions"}
            </h3>
            <div className="space-y-2">
              {stats.recentCommissions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
                >
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      +${(c.commissionCents / 100).toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      {isZh ? "来自" : "from"}{" "}
                      {c.sourceType === "subscription"
                        ? isZh
                          ? "订阅"
                          : "subscription"
                        : isZh
                          ? "充值"
                          : "top-up"}
                      {" "}
                      (${(c.sourceAmountCents / 100).toFixed(2)})
                    </span>
                  </div>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                    {format(new Date(c.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isZh ? "如何运作" : "How It Works"}
          </h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>
              {isZh
                ? "分享你的专属推荐链接给朋友"
                : "Share your unique referral link with friends"}
            </li>
            <li>
              {isZh
                ? "好友通过你的链接注册 xPilot"
                : "They sign up for xPilot through your link"}
            </li>
            <li>
              {isZh
                ? "好友每次消费时，你自动获得 5% 佣金（终身有效）"
                : "You earn 5% commission on every purchase they make (lifetime)"}
            </li>
            <li>
              {isZh
                ? "佣金自动存入你的积分余额"
                : "Commission is credited to your balance automatically"}
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
