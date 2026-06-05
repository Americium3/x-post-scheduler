/**
 * Shared helpers for the xPilot AI Studio chatbot.
 */
import type { LanguageModelUsage } from "ai";
import type { TokenUsage } from "./usage-tracking";
import { TEXT_MODELS, type AiTextModel } from "./ai-models";

export const CHAT_SOURCE = "chat";

/**
 * Flagship commercial models reserved for paying subscribers. Free + standard
 * models stay available to everyone (metered by credits); an active
 * subscription unlocks these and applies a usage discount.
 */
export const PREMIUM_CHAT_MODEL_IDS = new Set<string>([
  "openai/gpt-4o",
  "openai/gpt-5",
  "anthropic/claude-sonnet-4",
  "google/gemini-2.5-pro",
  "xai/grok-3",
  "mistral/mistral-medium",
]);

export function isPremiumChatModel(modelId: string): boolean {
  return PREMIUM_CHAT_MODEL_IDS.has(modelId);
}

export interface ChatModelOption extends AiTextModel {
  premium: boolean;
  locked: boolean;
}

/** Model list for the chat UI, flagged by whether the user can use each one. */
export function getChatModelOptions(isSubscriber: boolean): ChatModelOption[] {
  return TEXT_MODELS.map((m) => {
    const premium = isPremiumChatModel(m.id);
    return { ...m, premium, locked: premium && !isSubscriber };
  });
}

/** How many recent messages to send back to the model for context. */
export const HISTORY_CONTEXT_LIMIT = 20;

/** Max tool/agent steps the orchestrator may run before answering. */
export const MAX_CHAT_STEPS = 8;

/** Map the AI SDK v6 usage shape to the project's TokenUsage. */
export function toTokenUsage(usage?: LanguageModelUsage): TokenUsage {
  const promptTokens = usage?.inputTokens ?? 0;
  const completionTokens = usage?.outputTokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: usage?.totalTokens ?? promptTokens + completionTokens,
  };
}

/** Derive a short conversation title from the first user message. */
export function deriveTitle(firstMessage: string): string {
  const clean = firstMessage.trim().replace(/\s+/g, " ");
  if (!clean) return "New chat";
  return clean.length > 60 ? clean.slice(0, 57) + "..." : clean;
}

export function buildChatSystemPrompt(opts: {
  userName?: string | null;
  language?: string;
}): string {
  const langLine =
    opts.language === "zh"
      ? "Reply in 简体中文 unless the user writes in another language."
      : "Reply in the user's language. Match the language they write in.";

  return `You are xPilot AI, the all-in-one marketing copilot built into xPilot — a social media marketing platform for creators and small businesses.

You help users with social media strategy, content creation, post scheduling, trend and news research, audience growth, and analytics.

What you can help with (and act on through tools when they are available):
- Draft posts, tweets, and threads for X
- Plan and schedule recurring/automated posts
- Research trending topics and current news
- Search the user's own knowledge base for brand context
- Review account performance and suggest improvements

Style:
- Be concise, practical, and friendly. Prefer short paragraphs and bullet points.
- Use Markdown formatting.
- ${langLine}
- When the user asks you to perform an action xPilot supports and a matching tool exists, call the tool instead of only describing it.
- Never reveal internal infrastructure or upstream provider names.`;
}
