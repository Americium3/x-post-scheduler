"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useLocale } from "next-intl";

interface ChatModelOption {
  id: string;
  label: string;
  provider: string;
  description?: string;
  premium: boolean;
  locked: boolean;
}

interface Conversation {
  id: string;
  title: string;
  model: string | null;
  updatedAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

const T = {
  en: {
    newChat: "New chat",
    placeholder: "Ask xPilot anything about your social media…",
    send: "Send",
    empty: "Start a conversation with your marketing copilot.",
    thinking: "Thinking…",
    balance: "Balance",
    locked: "Subscribe to unlock",
    premium: "Premium",
    rename: "Rename",
    delete: "Delete",
    deleteConfirm: "Delete this conversation?",
    history: "History",
    running: "Running",
    suggestions: [
      "Draft 3 tweets about our product launch",
      "What's trending in tech today?",
      "Plan a week of posts for my brand",
    ],
  },
  zh: {
    newChat: "新对话",
    placeholder: "向 xPilot 询问任何社媒相关的问题…",
    send: "发送",
    empty: "和你的营销助手开始对话吧。",
    thinking: "思考中…",
    balance: "余额",
    locked: "订阅后解锁",
    premium: "高级",
    rename: "重命名",
    delete: "删除",
    deleteConfirm: "删除这个对话？",
    history: "历史",
    running: "正在执行",
    suggestions: [
      "帮我写 3 条产品发布的推文",
      "今天科技圈有什么热点？",
      "帮我规划本周的发帖内容",
    ],
  },
};

export default function ChatClient() {
  const locale = useLocale();
  const t = locale === "zh" ? T.zh : T.en;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [models, setModels] = useState<ChatModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [notice, setNotice] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Load model options + balance + conversation list on mount.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/chat/options");
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || []);
          setBalanceCents(typeof data.balanceCents === "number" ? data.balanceCents : null);
          const firstUsable = (data.models as ChatModelOption[])?.find((m) => !m.locked);
          if (firstUsable) setSelectedModel(firstUsable.id);
        }
      } catch {
        /* ignore */
      }
      refreshConversations();
    })();
  }, [refreshConversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, steps, scrollToBottom]);

  async function loadConversation(id: string) {
    if (streaming) return;
    setActiveId(id);
    setNotice("");
    try {
      const res = await fetch(`/api/chat?conversation_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.messages || []).map((m: { role: string; content: string }) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        );
      }
    } catch {
      /* ignore */
    }
  }

  function startNewChat() {
    if (streaming) return;
    setActiveId(null);
    setMessages([]);
    setNotice("");
  }

  function setLastAssistant(content: string) {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === "assistant") {
          next[i] = { role: "assistant", content };
          break;
        }
      }
      return next;
    });
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput("");
    setNotice("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg },
      { role: "assistant", content: "", pending: true },
    ]);
    setStreaming(true);
    setSteps([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, conversation_id: activeId, model: selectedModel }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setLastAssistant(err.error || "Something went wrong. Please try again.");
        if (res.status === 402 || res.status === 403) setNotice(err.error || "");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(payload);
          } catch {
            continue;
          }
          if (evt.type === "meta") {
            if (evt.conversationId) setActiveId(evt.conversationId as string);
            if (evt.isNewConversation) refreshConversations();
          } else if (evt.type === "delta") {
            assistant += evt.text as string;
            setLastAssistant(assistant);
          } else if (evt.type === "step") {
            setSteps((s) => [...s, evt.tool as string]);
          } else if (evt.type === "done") {
            if (typeof evt.balanceCents === "number") setBalanceCents(evt.balanceCents);
          }
        }
      }
    } catch {
      setLastAssistant("Network error. Please try again.");
    } finally {
      setStreaming(false);
      setSteps([]);
      refreshConversations();
    }
  }

  async function renameConversation(id: string, current: string) {
    const title = window.prompt(t.rename, current);
    if (!title || !title.trim()) return;
    await fetch(`/api/chat/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    refreshConversations();
  }

  async function deleteConversation(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
    if (activeId === id) startNewChat();
    refreshConversations();
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-3">
      {/* Conversation sidebar */}
      <div className="hidden md:flex md:flex-col md:w-60 shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-3">
          <button
            onClick={startNewChat}
            className="w-full px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            + {t.newChat}
          </button>
        </div>
        <div className="px-3 pb-1 text-xs uppercase tracking-wide text-gray-400">{t.history}</div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer ${
                activeId === c.id
                  ? "bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => loadConversation(c.id)}
            >
              <span className="flex-1 truncate">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  renameConversation(c.id, c.title);
                }}
                className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title={t.rename}
              >
                ✎
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500"
                title={t.delete}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Header: model selector + balance */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 px-4 py-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-1 text-gray-700 dark:text-gray-200 max-w-[60%]"
          >
            {models.map((m) => (
              <option
                key={m.id}
                value={m.id}
                disabled={m.locked}
                style={{ color: m.locked ? "#9ca3af" : "#111827" }}
              >
                {m.provider} · {m.label}
                {m.locked ? ` 🔒 (${t.locked})` : m.premium ? ` ✦` : ""}
              </option>
            ))}
          </select>
          {balanceCents !== null && (
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {t.balance}: ${(balanceCents / 100).toFixed(2)}
            </span>
          )}
        </div>

        {notice && (
          <div className="mx-4 mt-3 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {notice}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!hasMessages && (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-4">
              <p>{t.empty}</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {t.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                }`}
              >
                {m.role === "assistant" ? (
                  m.content ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-pre:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="text-gray-400">
                      {steps.length > 0 ? `${t.running}: ${steps[steps.length - 1]}…` : t.thinking}
                    </span>
                  )
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 dark:border-gray-700 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={t.placeholder}
              className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
            />
            <button
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.send}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
