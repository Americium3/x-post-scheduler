import type { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth0";
import LandingContent from "@/components/LandingContent";
import { setRequestLocale } from "next-intl/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_PUBLIC_URL ||
  "https://x-post-scheduler.jytech.us";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === "zh";
  const isEs = locale === "es";
  const isJa = locale === "ja";
  const isKo = locale === "ko";

  const titles: Record<string, string> = {
    en: "xPilot — AI Social Media Marketing Platform | Auto Post, Video & Image Generation",
    zh: "xPilot — AI 社媒营销平台 | 自动发帖 · AI 视频生成 · 图片创作 · 智能调度",
    es: "xPilot — Plataforma de Marketing en Redes Sociales con IA",
    ja: "xPilot — AI ソーシャルメディアマーケティングプラットフォーム",
    ko: "xPilot — AI 소셜 미디어 마케팅 플랫폼",
  };

  const descriptions: Record<string, string> = {
    en: "Schedule and auto-publish posts to X (Twitter). Generate videos with Seedance, Wan, and Kling AI models. Create images with FLUX and Seedream. AI-powered content creation, campaign management, and analytics — all in one platform. Start free with $5 credit.",
    zh: "AI 驱动的社交媒体自动发帖与内容创作平台。支持 Seedance、Wan 等 AI 模型生成视频，FLUX、Seedream 生成图片。智能调度发帖、Campaign 管理、数据分析，一站式助力品牌增长。注册即送 $5 免费点数。",
    es: "Programa y publica automáticamente en X (Twitter). Genera videos e imágenes con IA. Creación de contenido, gestión de campañas y análisis — todo en una plataforma. Comienza gratis con $5 de crédito.",
    ja: "X (Twitter) への自動投稿とスケジュール。AIでビデオや画像を生成。コンテンツ作成、キャンペーン管理、分析を一つのプラットフォームで。$5の無料クレジットで始めましょう。",
    ko: "X (Twitter) 자동 게시 및 스케줄링. AI로 비디오와 이미지를 생성하세요. 콘텐츠 제작, 캠페인 관리, 분석을 하나의 플랫폼에서. $5 무료 크레딧으로 시작하세요.",
  };

  const titleText = titles[locale] ?? titles.en;
  const description = descriptions[locale] ?? descriptions.en;

  const keywords = [
    "AI social media", "auto post", "schedule posts", "X Twitter",
    "AI video generation", "AI image generation", "Seedance", "Wan",
    "FLUX", "Seedream", "content creation", "social media automation",
    "marketing platform", "AI automation copilot", "post scheduler",
    "video editor", "post production", "campaign management",
  ];

  return {
    title: { absolute: titleText },
    description,
    keywords,
    alternates: {
      canonical: locale === "en" ? "/" : `/${locale}`,
      languages: { en: "/", zh: "/zh", es: "/es", ja: "/ja", ko: "/ko" },
    },
    openGraph: {
      title: titleText,
      description,
      url: locale === "en" ? "/" : `/${locale}`,
      type: "website",
      siteName: "xPilot",
      locale: isZh ? "zh_CN" : isJa ? "ja_JP" : isKo ? "ko_KR" : isEs ? "es_ES" : "en_US",
      images: [
        {
          url: "/api/og",
          width: 1200,
          height: 630,
          alt: titleText,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleText,
      description,
      images: ["/api/og"],
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getAuthenticatedUser();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "xPilot",
        url: SITE_URL,
        logo: `${SITE_URL}/api/og`,
        sameAs: ["https://x.com/xpilotai"],
      },
      {
        "@type": "WebApplication",
        name: "xPilot",
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "AI-powered social media marketing platform with auto-posting, AI video and image generation, post-production tools, campaign management, and analytics.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free to start with $5 credit. Pay-as-you-go pricing.",
        },
        featureList: [
          "AI Video Generation (Seedance, Wan, Kling)",
          "AI Image Generation (FLUX, Seedream, Dreamina)",
          "Auto-post scheduling to X (Twitter)",
          "Post-production tools with SAM2 tracking",
          "AI video editing with natural language",
          "Campaign management",
          "Knowledge base for brand voice",
          "Multi-language support (EN, ZH, ES, JA, KO)",
          "Analytics and sentiment monitoring",
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is xPilot?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "xPilot is an AI-powered social media marketing platform that helps you create, schedule, and auto-publish content to X (Twitter). It includes AI video and image generation, post-production tools, campaign management, and analytics.",
            },
          },
          {
            "@type": "Question",
            name: "How much does xPilot cost?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "xPilot is free to start with $5 in credits. Free AI models are available at zero cost. Paid models use pay-as-you-go pricing starting from $0.10 per generation.",
            },
          },
          {
            "@type": "Question",
            name: "What AI models does xPilot support?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "xPilot supports 30+ AI models including GPT-4o, Claude, Gemini, Llama, DeepSeek for text; FLUX, Seedream, Dreamina for images; and Seedance, Wan, Kling for video generation.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingContent isLoggedIn={!!user} />
    </>
  );
}
