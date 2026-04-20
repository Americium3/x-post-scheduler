import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Trend {
  name: string;
  url?: string;
  description?: string;
}

interface TrendSummary {
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  highlightsEn: string[];
  highlightsZh: string[];
}

async function generateTrendSummary(trends: Trend[]): Promise<TrendSummary | null> {
  if (!process.env.GEMINI_API_KEY || trends.length === 0) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const condensedTrends = trends.map((trend, index) => ({
      index: index + 1,
      name: trend.name,
      description: trend.description || "",
    }));

    const prompt = `You are a senior content strategist analyzing trending topics. Create a bilingual summary of these trending topics for video content creation.

Return JSON matching this exact schema:
{
  "titleEn": string,
  "titleZh": string,
  "summaryEn": string,
  "summaryZh": string,
  "highlightsEn": string[],
  "highlightsZh": string[]
}

TITLE RULES:
- The title MUST combine 2-3 DIFFERENT trending topics — pick the most interesting that contrast or complement each other.
- FORBIDDEN words: "developments", "updates", "insights", "roundup", "wrap", "trending topics"
- WRONG (generic): "Trending Topics: AI and Politics"
- RIGHT (specific): "AI Breakthrough Meets Political Debate; Tech Giants Respond"
- titleZh should follow the same multi-topic structure, using "；" as separator.

CONTENT RULES:
- summaryEn and summaryZh: 2–3 sentences summarizing the key themes and why they matter
- highlightsEn and highlightsZh: exactly 3-5 bullets each
  - Each bullet should be actionable or insightful
  - Focus on what makes each trend significant
- Professional, engaging tone suitable for video content

Trending Topics:
${JSON.stringify(condensedTrends, null, 2)}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<TrendSummary>;
    
    // Validate required fields
    if (!parsed.titleEn || !parsed.summaryEn || !parsed.titleZh || !parsed.summaryZh) {
      return null;
    }

    return {
      titleEn: parsed.titleEn.trim(),
      titleZh: parsed.titleZh.trim(),
      summaryEn: parsed.summaryEn.trim(),
      summaryZh: parsed.summaryZh.trim(),
      highlightsEn: (parsed.highlightsEn ?? [])
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
        .slice(0, 5),
      highlightsZh: (parsed.highlightsZh ?? [])
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
        .slice(0, 5),
    };
  } catch (error) {
    console.error("Failed to generate trend summary:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trends } = body as { trends: Trend[] };

    if (!trends || !Array.isArray(trends) || trends.length === 0) {
      return NextResponse.json(
        { error: "Invalid trends data" },
        { status: 400 }
      );
    }

    const summary = await generateTrendSummary(trends);

    if (!summary) {
      // Fallback summary
      const trendNames = trends.map(t => t.name).join(", ");
      return NextResponse.json({
        summary: `Current trending topics: ${trendNames}. These topics represent significant public interest and could be great content opportunities.`,
        titleEn: "Trending Topics Summary",
        titleZh: "热门话题摘要",
        summaryEn: `Analysis of ${trends.length} trending topics including ${trends[0].name}.`,
        summaryZh: `分析 ${trends.length} 个热门话题，包括 ${trends[0].name}。`,
        highlightsEn: trends.map(t => t.name),
        highlightsZh: trends.map(t => t.name),
      });
    }

    // Format the summary for display
    const formattedSummary = `📊 ${summary.titleEn}\n\n${summary.summaryEn}\n\n🔥 Key Highlights:\n${summary.highlightsEn.map((h, i) => `${i + 1}. ${h}`).join("\n")}`;

    return NextResponse.json({
      success: true,
      summary: formattedSummary,
      ...summary,
    });
  } catch (error) {
    console.error("Error generating trend summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
