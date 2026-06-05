/**
 * Tools exposed to the xPilot AI Studio chatbot. The model can call these to
 * act on the user's behalf. All tools here are read-only or draft-only (they
 * never publish to X), so the assistant is safe to use interactively.
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { prisma } from "./db";
import { generateTweetViaGateway } from "./ai-gateway";
import { fetchTrendingTopics, trendRegionWoeid } from "./trending";

export interface ChatToolContext {
  userId: string;
  language: string;
}

export function buildChatTools(ctx: ChatToolContext): ToolSet {
  return {
    generate_posts: tool({
      description:
        "Generate draft tweets/posts for X about a topic, using the user's knowledge base for brand voice. Returns drafts only — never publishes.",
      inputSchema: z.object({
        topic: z.string().describe("What the posts should be about"),
        count: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe("How many drafts to produce (default 3)"),
      }),
      execute: async ({ topic, count }) => {
        const n = Math.min(Math.max(count ?? 3, 1), 5);
        const sources = await prisma.knowledgeSource.findMany({
          where: { userId: ctx.userId, isActive: true },
          take: 2,
          select: { content: true },
        });
        const knowledgeContext = sources
          .map((s) => s.content)
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 2000);

        const drafts: string[] = [];
        for (let i = 0; i < n; i++) {
          const r = await generateTweetViaGateway({
            knowledgeContext,
            prompt: topic,
            language: ctx.language,
          });
          if (r.success && r.content) drafts.push(r.content.trim());
        }
        if (drafts.length === 0)
          return "Could not generate drafts right now. Please try again.";
        return drafts.map((d, i) => `Draft ${i + 1}:\n${d}`).join("\n\n");
      },
    }),

    get_trending_topics: tool({
      description:
        "Fetch current trending news/topics for a region to inspire timely content.",
      inputSchema: z.object({
        region: z
          .enum(["global", "usa", "china"])
          .optional()
          .describe("Region to pull trends for (default usa)"),
      }),
      execute: async ({ region }) => {
        const woeid = trendRegionWoeid[region ?? "usa"] ?? trendRegionWoeid.usa;
        const r = await fetchTrendingTopics(ctx.userId, woeid);
        if (!r.success || !r.trends?.length) {
          return r.error || "No trending topics available right now.";
        }
        return r.trends
          .slice(0, 10)
          .map(
            (t, i) =>
              `${i + 1}. ${t.name}${t.description ? ` — ${t.description}` : ""}`,
          )
          .join("\n");
      },
    }),

    search_knowledge_base: tool({
      description:
        "Search the user's own knowledge base (their imported website/brand content) for relevant context.",
      inputSchema: z.object({
        query: z.string().describe("What to look for in the knowledge base"),
      }),
      execute: async ({ query }) => {
        const sources = await prisma.knowledgeSource.findMany({
          where: {
            userId: ctx.userId,
            isActive: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { content: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 3,
          select: { name: true, url: true, content: true },
        });
        if (sources.length === 0)
          return "No matching knowledge base entries found.";
        return sources
          .map(
            (s) =>
              `**${s.name}** (${s.url})\n${s.content.slice(0, 400)}${
                s.content.length > 400 ? "..." : ""
              }`,
          )
          .join("\n\n");
      },
    }),

    get_recent_posts_performance: tool({
      description:
        "Get the user's recently posted tweets and their engagement metrics, to inform strategy.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("How many recent posts (default 5)"),
      }),
      execute: async ({ limit }) => {
        const take = Math.min(Math.max(limit ?? 5, 1), 10);
        const posts = await prisma.post.findMany({
          where: { userId: ctx.userId, status: "posted" },
          orderBy: { postedAt: "desc" },
          take,
          select: {
            content: true,
            impressions: true,
            likes: true,
            retweets: true,
            replies: true,
            postedAt: true,
          },
        });
        if (posts.length === 0)
          return "No posted tweets found yet for this account.";
        return posts
          .map((p) => {
            const snippet = p.content.replace(/\s+/g, " ").slice(0, 80);
            return `- "${snippet}" — ${p.impressions ?? 0} impressions, ${
              p.likes ?? 0
            } likes, ${p.retweets ?? 0} retweets, ${p.replies ?? 0} replies`;
          })
          .join("\n");
      },
    }),
  };
}
