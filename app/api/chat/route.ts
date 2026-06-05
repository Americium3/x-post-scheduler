import { NextRequest, NextResponse } from "next/server";
import { streamText, stepCountIs } from "ai";
import { prisma } from "@/lib/db";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { getModel } from "@/lib/ai-gateway";
import { resolveTextModel } from "@/lib/ai-models";
import { hasCredits, deductCredits, getCreditBalance } from "@/lib/credits";
import { trackTokenUsage } from "@/lib/usage-tracking";
import {
  CHAT_SOURCE,
  HISTORY_CONTEXT_LIMIT,
  MAX_CHAT_STEPS,
  buildChatSystemPrompt,
  deriveTitle,
  toTokenUsage,
  isPremiumChatModel,
} from "@/lib/chat";
import { buildChatTools } from "@/lib/chat-tools";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET /api/chat?conversation_id=...  → message history for one conversation
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const conversationId = req.nextUrl.searchParams.get("conversation_id");
  if (!conversationId) {
    return NextResponse.json({ messages: [] });
  }

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: user.id },
    select: { id: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId, userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      model: true,
      toolCalls: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ messages });
}

// POST /api/chat  → send a message, stream the assistant reply (SSE)
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  if (!(await hasCredits(user.id))) {
    return NextResponse.json(
      {
        error:
          "Insufficient credits. Add credits or upgrade your plan in Settings to keep chatting.",
        code: "INSUFFICIENT_CREDITS",
      },
      { status: 402 },
    );
  }

  let body: { message?: string; conversation_id?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const model = resolveTextModel(body.model);

  // Premium flagship models require an active subscription.
  if (isPremiumChatModel(model.id)) {
    const sub = await prisma.user.findUnique({
      where: { id: user.id },
      select: { subscriptionStatus: true },
    });
    if (sub?.subscriptionStatus !== "active") {
      return NextResponse.json(
        {
          error: `${model.label} is a premium model. Subscribe to any plan in Settings to unlock it — or pick a free/standard model to keep chatting.`,
          code: "PREMIUM_MODEL_LOCKED",
        },
        { status: 403 },
      );
    }
  }

  // Resolve or create the conversation (verifying ownership).
  let conversationId = body.conversation_id || null;
  let isNewConversation = false;
  if (conversationId) {
    const existing = await prisma.chatConversation.findFirst({
      where: { id: conversationId, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
  } else {
    const created = await prisma.chatConversation.create({
      data: { userId: user.id, title: deriveTitle(message), model: model.id },
      select: { id: true },
    });
    conversationId = created.id;
    isNewConversation = true;
  }

  // Load recent history for context (chronological).
  const history = await prisma.chatMessage.findMany({
    where: { conversationId, userId: user.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_CONTEXT_LIMIT,
    select: { role: true, content: true },
  });
  history.reverse();

  // Persist the user's message immediately.
  await prisma.chatMessage.create({
    data: { conversationId, userId: user.id, role: "user", content: message },
  });

  const modelMessages = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, obj: unknown) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

  const stream = new ReadableStream({
    async start(controller) {
      // Tell the client which conversation this belongs to (esp. for new ones).
      send(controller, { type: "meta", conversationId, model: model.id, isNewConversation });

      let assistantText = "";
      const toolEvents: { tool: string; input?: unknown; output?: unknown }[] = [];
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      try {
        const result = streamText({
          model: getModel(model.id),
          system: buildChatSystemPrompt({ userName: user.name, language: user.language }),
          messages: modelMessages,
          tools: buildChatTools({ userId: user.id, language: user.language }),
          stopWhen: stepCountIs(MAX_CHAT_STEPS),
        });

        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            assistantText += part.text;
            send(controller, { type: "delta", text: part.text });
          } else if (part.type === "tool-call") {
            toolEvents.push({ tool: part.toolName, input: part.input });
            send(controller, { type: "step", tool: part.toolName });
          } else if (part.type === "tool-result") {
            const ev = toolEvents.find((t) => t.tool === part.toolName && t.output === undefined);
            if (ev) ev.output = part.output;
            send(controller, { type: "step_done", tool: part.toolName });
          } else if (part.type === "tool-error") {
            send(controller, { type: "step_error", tool: part.toolName });
          } else if (part.type === "finish") {
            usage = toTokenUsage(part.totalUsage);
          } else if (part.type === "error") {
            throw part.error instanceof Error ? part.error : new Error(String(part.error));
          }
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error("[POST /api/chat] stream error:", detail);
        if (!assistantText) {
          assistantText = `**AI service error.** ${detail.slice(0, 300)}\n\nPlease try again, or check your API key configuration in Settings.`;
          send(controller, { type: "delta", text: assistantText });
        }
      }

      // Persist the assistant reply.
      try {
        await prisma.chatMessage.create({
          data: {
            conversationId: conversationId!,
            userId: user.id,
            role: "assistant",
            content: assistantText || "(no response)",
            model: model.id,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            toolCalls: toolEvents.length > 0 ? JSON.stringify(toolEvents) : null,
          },
        });
        await prisma.chatConversation.update({
          where: { id: conversationId! },
          data: { updatedAt: new Date(), model: model.id },
        });
      } catch (e) {
        console.error("[POST /api/chat] persist error:", e);
      }

      // Track usage + deduct credits (best-effort, never block the reply).
      let balance: number | undefined;
      if (usage.totalTokens > 0) {
        try {
          await trackTokenUsage({
            userId: user.id,
            source: CHAT_SOURCE,
            usage,
            model: model.id,
            provider: model.provider.toLowerCase(),
          });
          const res = await deductCredits({
            userId: user.id,
            usage,
            model: model.id,
            source: CHAT_SOURCE,
          });
          balance = res.newBalance;
        } catch (e) {
          console.error("[POST /api/chat] billing error:", e);
        }
      }
      if (balance === undefined) {
        try {
          balance = await getCreditBalance(user.id);
        } catch {
          /* ignore */
        }
      }

      send(controller, {
        type: "done",
        conversationId,
        model: model.id,
        usage,
        balanceCents: balance,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
