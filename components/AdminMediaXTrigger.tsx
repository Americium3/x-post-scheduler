"use client";

import { useState, useEffect } from "react";

type Period = "daily" | "weekly";

type TriggerResult = {
  success: boolean;
  period?: string;
  reportDate?: string;
  accountCount?: number;
  totalTweets?: number;
  sourceCount?: number;
  usedAi?: boolean;
  error?: string;
};

type BackfillEntry = {
  date: string;
  status: "pending" | "running" | "done" | "error";
  result?: TriggerResult;
};

type MonitorAccount = {
  id: string;
  xAccountId: string;
  username: string;
  createdAt: string;
};

function getPastDates(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    );
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export default function AdminMediaXTrigger() {
  const [loadingPeriod, setLoadingPeriod] = useState<Period | null>(null);
  const [result, setResult] = useState<TriggerResult | null>(null);

  // Backfill state
  const [backfillEntries, setBackfillEntries] = useState<BackfillEntry[]>([]);
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Clear archive state
  const [clearingPeriod, setClearingPeriod] = useState<Period | null>(null);
  const [clearResult, setClearResult] = useState<{ period: string; deleted: number } | { error: string } | null>(null);

  // Monitor accounts state
  const [accounts, setAccounts] = useState<MonitorAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function trigger(period: Period, date?: string) {
    setLoadingPeriod(period);
    setResult(null);
    try {
      const url = date
        ? `/api/admin/trigger-media-x?period=${period}&date=${date}`
        : `/api/admin/trigger-media-x?period=${period}`;
      const res = await fetch(url, { method: "POST" });
      const data = (await res.json()) as TriggerResult;
      setResult(data);
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setLoadingPeriod(null);
    }
  }

  async function clearArchive(period: Period) {
    setClearingPeriod(period);
    setClearResult(null);
    try {
      const res = await fetch(`/api/admin/clear-media-x?period=${period}`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; deleted?: number; error?: string };
      if (data.success) {
        setClearResult({ period, deleted: data.deleted ?? 0 });
      } else {
        setClearResult({ error: data.error ?? "Unknown error" });
      }
    } catch {
      setClearResult({ error: "Network error" });
    } finally {
      setClearingPeriod(null);
    }
  }

  async function startBackfill(days: number) {
    if (isBackfilling) return;
    const dates = getPastDates(days);
    const entries: BackfillEntry[] = dates.map((date) => ({
      date,
      status: "pending",
    }));
    setBackfillEntries(entries);
    setIsBackfilling(true);

    for (let i = 0; i < entries.length; i++) {
      setBackfillEntries((prev) =>
        prev.map((e, idx) => (idx === i ? { ...e, status: "running" } : e)),
      );

      try {
        const res = await fetch(
          `/api/admin/trigger-media-x?period=daily&date=${entries[i].date}`,
          { method: "POST" },
        );
        const data = (await res.json()) as TriggerResult;
        setBackfillEntries((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "done", result: data } : e,
          ),
        );
      } catch {
        setBackfillEntries((prev) =>
          prev.map((e, idx) =>
            idx === i
              ? { ...e, status: "error", result: { success: false, error: "Network error" } }
              : e,
          ),
        );
      }
    }

    setIsBackfilling(false);
  }

  const doneCount = backfillEntries.filter((e) => e.status === "done" || e.status === "error").length;

  // Load accounts on mount
  useEffect(() => {
    void loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/admin/media-x-accounts");
      const data = await res.json() as { accounts: MonitorAccount[] };
      setAccounts(data.accounts || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function addAccount() {
    const username = newUsername.trim();
    const accountId = newAccountId.trim();
    if (!username || !accountId) return;

    setAddingAccount(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/media-x-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, xAccountId: accountId }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) {
        setNewUsername("");
        setNewAccountId("");
        await loadAccounts();
      } else {
        setAddError(data.error || "添加失败");
      }
    } catch {
      setAddError("网络错误");
    } finally {
      setAddingAccount(false);
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm("确认删除此监控账号？")) return;

    try {
      const res = await fetch(`/api/admin/media-x-accounts?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json() as { success: boolean };
      if (data.success) {
        await loadAccounts();
      }
    } catch {
      alert("删除失败");
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
      {/* ── Monitor accounts section ── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          X监控账号管理
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          添加或删除要监控的 X 账号。这些账号的推文将被自动收集并生成报告。
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAccountId}
            onChange={(e) => setNewAccountId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addAccount();
            }}
            placeholder="输入 X Account ID (例如: elonmusk)"
            disabled={addingAccount}
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addAccount();
            }}
            placeholder="输入 X 用户名 (例如: Elon Musk)"
            disabled={addingAccount}
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={() => void addAccount()}
            disabled={addingAccount || !newUsername.trim() || !newAccountId.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingAccount ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                添加中…
              </>
            ) : (
              "添加账号"
            )}
          </button>
        </div>

        {addError && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 px-4 py-2 text-sm text-red-800 dark:text-red-300">
            ✗ {addError}
          </div>
        )}

        {loadingAccounts ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="inline-block animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无监控账号
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Account ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    用户名
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    添加时间
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {accounts.map((account) => (
                  <tr key={account.id} className="bg-white dark:bg-gray-800">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">
                      @{account.xAccountId}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {account.username}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {new Date(account.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void deleteAccount(account.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Single-trigger section ── */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          X 账号监控报告 · 手动触发
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          监控指定 X 账号的推文活动。点击下方按钮可立即触发生成报告。
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => trigger("daily")}
            disabled={loadingPeriod !== null || isBackfilling}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPeriod === "daily" ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                生成中…
              </>
            ) : (
              "触发今日报告"
            )}
          </button>

          <button
            onClick={() => trigger("weekly")}
            disabled={loadingPeriod !== null || isBackfilling}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPeriod === "weekly" ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                生成中…
              </>
            ) : (
              "触发本周报告"
            )}
          </button>
        </div>

        {result && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              result.success
                ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                : "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 text-red-800 dark:text-red-300"
            }`}
          >
            {result.success ? (
              <div className="space-y-0.5">
                <p className="font-medium">✓ 生成成功</p>
                <p>
                  日期：{result.reportDate} · 账号：{result.accountCount} 个 · 推文：{result.totalTweets} 条 ·{" "}
                  {result.usedAi ? "AI 汇总" : "规则汇总"}
                </p>
              </div>
            ) : (
              <p>✗ {result.error}</p>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          提示：需要先在数据库 MediaMonitorXAccounts 表中配置要监控的 X 账号
        </p>
      </div>

      {/* ── Clear archive section ── */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          清空存档
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          删除数据库中所有旧的 X 账号报告记录（不可恢复）。清空后可重新生成新内容。
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          {(["daily", "weekly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                if (confirm(`确认清空所有${p === "daily" ? "日报" : "周报"}记录？此操作不可恢复。`)) {
                  void clearArchive(p);
                }
              }}
              disabled={clearingPeriod !== null || isBackfilling || loadingPeriod !== null}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearingPeriod === p ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  清空中…
                </>
              ) : (
                `清空所有${p === "daily" ? "日报" : "周报"}`
              )}
            </button>
          ))}
        </div>

        {clearResult && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${"error" in clearResult
            ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 text-red-800 dark:text-red-300"
            : "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20 text-green-800 dark:text-green-300"
          }`}>
            {"error" in clearResult
              ? `✗ ${clearResult.error}`
              : `✓ 已删除 ${clearResult.deleted} 条${clearResult.period === "daily" ? "日报" : "周报"}记录`}
          </div>
        )}
      </div>

      {/* ── Backfill section ── */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          补跑历史报告
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          用最新代码重新生成历史报告，覆盖数据库中的旧记录。
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          {[7, 14].map((days) => (
            <button
              key={days}
              onClick={() => startBackfill(days)}
              disabled={isBackfilling || loadingPeriod !== null}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBackfilling && backfillEntries.length === days ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  {doneCount}/{days} 完成…
                </>
              ) : (
                `重新生成近 ${days} 天`
              )}
            </button>
          ))}
        </div>

        {backfillEntries.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    日期
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    状态
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    详情
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {backfillEntries.map((entry) => (
                  <tr
                    key={entry.date}
                    className="bg-white dark:bg-gray-800"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {entry.date}
                    </td>
                    <td className="px-3 py-2">
                      {entry.status === "pending" && (
                        <span className="text-gray-400">等待中</span>
                      )}
                      {entry.status === "running" && (
                        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                          <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                          生成中
                        </span>
                      )}
                      {entry.status === "done" && entry.result?.success && (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {entry.result.accountCount} 账号
                        </span>
                      )}
                      {(entry.status === "error" ||
                        (entry.status === "done" && !entry.result?.success)) && (
                        <span className="text-red-600 dark:text-red-400 text-xs">
                          ✗ {entry.result?.error ?? "失败"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {entry.result?.totalTweets ? `${entry.result.totalTweets} 条推文` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
