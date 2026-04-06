import type { Metadata } from "next";
import Link from "next/link";
import { use } from "react";

export const metadata: Metadata = {
  title: "Pricing | xPilot",
  description:
    "xPilot pricing plans — subscription tiers, AI model costs, and credit-based pay-as-you-go options for text, image, and video generation.",
};

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function Check() {
  return (
    <svg
      className="w-4 h-4 text-green-500 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function Cross() {
  return (
    <svg
      className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/* ── Data ────────────────────────────────────────────────────────────── */

const TIERS = [
  {
    key: "wood",
    en: "Wood",
    zh: "木头",
    price: 3,
    yearly: 30,
    accounts: 1,
    color: "green",
    popular: false,
  },
  {
    key: "bronze",
    en: "Bronze",
    zh: "青铜",
    price: 5,
    yearly: 50,
    accounts: 2,
    color: "amber",
    popular: false,
  },
  {
    key: "iron",
    en: "Iron",
    zh: "钢铁",
    price: 8,
    yearly: 80,
    accounts: 3,
    color: "slate",
    popular: false,
  },
  {
    key: "silver",
    en: "Silver",
    zh: "白银",
    price: 18,
    yearly: 180,
    accounts: 5,
    color: "blue",
    popular: true,
  },
  {
    key: "gold",
    en: "Gold",
    zh: "黄金",
    price: 188,
    yearly: 1880,
    accounts: 10,
    color: "yellow",
    popular: false,
  },
];

const TEXT_MODELS = [
  { label: "GPT-4o", provider: "OpenAI", cost: "~$0.05–0.20" },
  { label: "GPT-4o Mini", provider: "OpenAI", cost: "~$0.003–0.01" },
  { label: "GPT-5", provider: "OpenAI", cost: "~$0.03–0.20" },
  { label: "Claude Sonnet 4", provider: "Anthropic", cost: "~$0.06–0.30" },
  { label: "Claude 3.5 Haiku", provider: "Anthropic", cost: "~$0.02–0.08" },
  { label: "Gemini 2.5 Flash", provider: "Google", cost: "~$0.006–0.05" },
  { label: "Gemini 2.5 Pro", provider: "Google", cost: "~$0.03–0.20" },
  { label: "Grok 3", provider: "xAI", cost: "~$0.06–0.30" },
  { label: "Grok 3 Mini", provider: "xAI", cost: "~$0.006–0.01" },
  { label: "Mistral Small", provider: "Mistral", cost: "~$0.002–0.006" },
  { label: "Mistral Medium", provider: "Mistral", cost: "~$0.008–0.04" },
];

const IMAGE_MODELS = [
  { label: "Seedream 4.5", cost: "$0.20" },
  { label: "Seedream 4", cost: "$0.20" },
  { label: "Dreamina 3.1", cost: "$0.30" },
  { label: "Qwen Image", cost: "$0.25" },
  { label: "Wan 2.6 Image", cost: "$0.40" },
  { label: "UNO", cost: "$0.25" },
  { label: "Real-ESRGAN", cost: "$0.25" },
  { label: "FLUX Kontext Pro", cost: "$0.40" },
  { label: "FLUX Kontext Pro Multi", cost: "$0.40" },
];

const VIDEO_MODELS = [
  { label: "Wan 2.2 — 480p Ultra Fast", cost: "$0.25/5s", mode: "t2v" },
  { label: "Wan 2.2 — 720p", cost: "$1.50/5s", mode: "t2v" },
  { label: "Wan 2.6", cost: "$2.00/5s", mode: "t2v" },
  { label: "Seedance 1.5 Pro", cost: "$2.50/5s", mode: "t2v" },
  { label: "Kling Video O3", cost: "$3.00/5s", mode: "t2v" },
  { label: "Seedance 2.0", cost: "$3.00/5s", mode: "t2v" },
  { label: "Wan 2.2 i2v — 480p Fast", cost: "$1.50/5s", mode: "i2v" },
  { label: "Wan 2.2 i2v — 720p", cost: "$1.50/5s", mode: "i2v" },
  { label: "Seedance 1.5 Pro i2v", cost: "$1.50/5s", mode: "i2v" },
  { label: "Seedance 2.0 i2v", cost: "$3.00/5s", mode: "i2v" },
];

/* ── Page ────────────────────────────────────────────────────────────── */

export default function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isZh = locale === "zh";
  const prefix = isZh ? "/zh" : "";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Back link */}
        <Link
          href={isZh ? "/zh" : "/"}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-8 inline-block text-sm font-medium transition"
        >
          &larr; {isZh ? "返回首页" : "Back to Home"}
        </Link>

        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            {isZh ? "定价方案" : "Pricing"}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {isZh
              ? "灵活的按需付费 + 订阅方案，按需扩展"
              : "Flexible pay-as-you-go credits + subscription plans that scale with you"}
          </p>
        </div>

        {/* ── Subscription Plans ─────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            {isZh ? "订阅方案" : "Subscription Plans"}
          </h2>
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-8 text-center max-w-2xl mx-auto">
            {isZh
              ? "提示：AI Post Scheduler（自动发布）仅订阅会员可用。"
              : "Note: AI Post Scheduler (auto-post) is available to subscribed members only."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Free tier */}
            <div className="relative rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 flex flex-col text-left">
              <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
                {isZh ? "按需付费" : "Pay as you go"}
              </p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">
                $0
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  /mo
                </span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400 flex-1">
                <li className="flex items-center gap-2">
                  <Check />
                  {isZh ? "按需购买积分" : "Buy credits as needed"}
                </li>
                <li className="flex items-center gap-2">
                  <Check />
                  {isZh ? "所有 AI 模型均可使用" : "Access to all AI models"}
                </li>
                <li className="flex items-center gap-2">
                  <Cross />
                  {isZh
                    ? "不支持社交账号自动发布"
                    : "No social auto-posting"}
                </li>
                <li className="flex items-center gap-2">
                  <Cross />
                  {isZh ? "无认证标识" : "No verified badge"}
                </li>
              </ul>
              <Link
                href={`${prefix}/login`}
                className="mt-5 block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {isZh ? "开始使用" : "Get Started"}
              </Link>
            </div>

            {/* Paid tiers */}
            {TIERS.map((tier) => (
              <div
                key={tier.key}
                className={`relative rounded-2xl border-2 p-6 flex flex-col text-left ${
                  tier.popular
                    ? "border-blue-500 shadow-lg"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {isZh ? "最受欢迎" : "Most Popular"}
                  </span>
                )}
                <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
                  {isZh ? tier.zh : tier.en}
                </p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  ${tier.price}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    /mo
                  </span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {isZh
                    ? `年付 $${tier.yearly}/年（省 2 个月）`
                    : `$${tier.yearly}/yr (save 2 months)`}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400 flex-1">
                  <li className="flex items-center gap-2">
                    <Check />
                    {isZh
                      ? `${tier.accounts} 个社交账号`
                      : `${tier.accounts} social account${tier.accounts > 1 ? "s" : ""}`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check />
                    {isZh
                      ? `每月充值 $${tier.price} 积分`
                      : `$${tier.price} monthly credits`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check />
                    {isZh ? "AI 自动发布" : "AI auto-posting"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check />
                    {isZh ? "认证会员标识" : "Verified badge"}
                  </li>
                  {tier.key === "silver" && (
                    <li className="flex items-center gap-2">
                      <Check />
                      {isZh ? "积分 8% 折扣" : "8% credit discount"}
                    </li>
                  )}
                  {tier.key === "gold" && (
                    <li className="flex items-center gap-2">
                      <Check />
                      {isZh ? "积分 10% 折扣" : "10% credit discount"}
                    </li>
                  )}
                </ul>
                <Link
                  href={`${prefix}/login`}
                  className={`mt-5 block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    tier.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {isZh ? "立即订阅" : "Subscribe"}
                </Link>
              </div>
            ))}
          </div>

          {/* Enterprise */}
          <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {isZh ? "企业版" : "Enterprise"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isZh
                  ? "专属定制方案，适合月预算 $15k+ 的团队与企业客户——更多账号、更高配额、私有部署支持"
                  : "Custom solutions for teams & enterprises with $15k+ monthly budget — more accounts, higher limits, and dedicated support"}
              </p>
            </div>
            <a
              href="https://jytech.us"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto shrink-0 px-6 py-2.5 text-sm font-semibold rounded-lg border-2 border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors text-center"
            >
              {isZh ? "联系我们" : "Contact Us"}
            </a>
          </div>
        </section>

        {/* ── AI Model Pricing ───────────────────────────────────── */}
        <section className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            {isZh ? "AI 模型定价" : "AI Model Pricing"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-10 text-center max-w-2xl mx-auto">
            {isZh
              ? "所有模型均按积分使用量扣费，无隐藏费用。银牌会员享 8% 折扣，金牌会员享 10% 折扣。"
              : "All models are charged per credit usage — no hidden fees. Silver members get 8% off, Gold members get 10% off."}
          </p>

          {/* Text models */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-sm">
                T
              </span>
              {isZh ? "文本生成模型" : "Text Generation Models"}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      {isZh ? "模型" : "Model"}
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      {isZh ? "提供商" : "Provider"}
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">
                      {isZh ? "每次大约" : "Approx. per use"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {TEXT_MODELS.map((m) => (
                    <tr
                      key={m.label}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {m.label}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {m.provider}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                        {m.cost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {isZh
                ? "* 文本模型按 token 使用量计费，费用因请求长度而异。"
                : "* Text models are billed per token — cost varies by request length."}
            </p>
          </div>

          {/* Image models */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 text-sm">
                I
              </span>
              {isZh ? "图片生成模型" : "Image Generation Models"}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      {isZh ? "模型" : "Model"}
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">
                      {isZh ? "每张" : "Per image"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {IMAGE_MODELS.map((m) => (
                    <tr
                      key={m.label}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {m.label}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                        {m.cost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Video models */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm">
                V
              </span>
              {isZh ? "视频生成模型" : "Video Generation Models"}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      {isZh ? "模型" : "Model"}
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      {isZh ? "模式" : "Mode"}
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">
                      {isZh ? "每 5 秒" : "Per 5s"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {VIDEO_MODELS.map((m) => (
                    <tr
                      key={m.label}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {m.label}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            m.mode === "t2v"
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                              : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400"
                          }`}
                        >
                          {m.mode === "t2v"
                            ? isZh
                              ? "文生视频"
                              : "Text→Video"
                            : isZh
                              ? "图生视频"
                              : "Image→Video"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                        {m.cost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            {isZh ? "常见问题" : "Frequently Asked Questions"}
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                q: isZh ? "积分是什么？" : "What are credits?",
                a: isZh
                  ? "积分是 xPilot 的统一货币。充值后可用于所有 AI 文本、图片、视频生成。1 美元 = 100 积分（cents）。"
                  : "Credits are xPilot's unified currency. After topping up, credits can be used across all AI text, image, and video generation. $1 = 100 credits (cents).",
              },
              {
                q: isZh
                  ? "订阅和按需付费有什么区别？"
                  : "What's the difference between subscription and pay-as-you-go?",
                a: isZh
                  ? "订阅会员每月自动获得等额积分充值，并解锁社交账号自动发布、认证标识等高级功能。按需付费用户可以随时购买积分，但无法使用自动发布功能。"
                  : "Subscribers get monthly credit top-ups automatically and unlock premium features like social auto-posting and verified badges. Pay-as-you-go users can buy credits anytime but cannot use auto-posting.",
              },
              {
                q: isZh ? "积分会过期吗？" : "Do credits expire?",
                a: isZh
                  ? "不会。积分充值后永久有效，不会因为取消订阅而消失。"
                  : "No. Credits never expire and remain in your account even if you cancel your subscription.",
              },
              {
                q: isZh ? "可以免费试用吗？" : "Can I try it for free?",
                a: isZh
                  ? "可以！未登录用户每天可获得 $1 的免费试用额度，体验所有 AI 模型。"
                  : "Yes! Unregistered users get $1 in free trial credits daily to try all AI models.",
              },
              {
                q: isZh
                  ? "我可以随时取消订阅吗？"
                  : "Can I cancel anytime?",
                a: isZh
                  ? "可以。取消后将在当前计费周期结束时停止续费，已有积分不受影响。"
                  : "Yes. After canceling, your subscription will stop at the end of the current billing period. Existing credits are unaffected.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 sm:p-6"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {faq.q}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            href={`${prefix}/login`}
            className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            {isZh ? "免费开始使用" : "Get Started for Free"}
          </Link>
        </div>
      </div>
    </div>
  );
}
