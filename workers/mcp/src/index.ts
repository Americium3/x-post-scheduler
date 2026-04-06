/**
 * xPilot MCP Server — Cloudflare Worker
 *
 * Exposes xPilot AI capabilities (image/video/text generation) via MCP protocol.
 * Auth: Bearer token (xPilot API Key) verified against the main app.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

interface Env {
  BASE_URL: string;
}

// ── Auth ────────────────────────────────────────────────────────────────────

async function verifyApiKey(
  request: Request,
  baseUrl: string,
): Promise<Response | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return Response.json(
      { error: { message: "Missing API key. Pass Authorization: Bearer xp_...", code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  const res = await fetch(`${baseUrl}/api/v1/auth/verify`, {
    headers: { authorization: auth },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return Response.json(
      { error: { message: (data as Record<string, unknown>)?.error || "Invalid API key", code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  return null; // auth passed
}

// ── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function corsResponse(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// ── MCP Server factory ─────────────────────────────────────────────────────

function createMCPServer(baseUrl: string, authHeader: string) {
  const server = new McpServer({ name: "xPilot", version: "1.0.0" });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    authorization: authHeader,
  };

  // Tool: List available AI models
  server.tool(
    "list_models",
    "List all available AI models on xPilot, grouped by category (text, image, video). Includes 13 free models.",
    {},
    async () => {
      try {
        const res = await fetch(`${baseUrl}/api/v1/models`);
        const data = await res.json();
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "Failed to list models"}` }], isError: true };
      }
    },
  );

  // Tool: Generate image
  server.tool(
    "generate_image",
    "Generate an AI image using xPilot. Supports text-to-image with multiple models including free FLUX and Seedream models.",
    {
      prompt: z.string().describe("Text description of the image to generate"),
      model: z.string().optional().describe("Model ID, e.g. 'flux-2-pro' (free), 'seedream-v4.5'. Defaults to free FLUX.2 Pro"),
      aspectRatio: z.string().optional().describe("Aspect ratio: '1:1', '16:9', '9:16'. Default '1:1'"),
    },
    async ({ prompt, model, aspectRatio }) => {
      try {
        const res = await fetch(`${baseUrl}/api/v1/image/generate`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt,
            modelId: model ? `openrouter/black-forest-labs/${model}` : "openrouter/black-forest-labs/flux-2-pro",
            aspectRatio: aspectRatio || "1:1",
          }),
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (!res.ok) return { content: [{ type: "text" as const, text: `Error: ${data.error}` }], isError: true };
        const task = data.task as Record<string, unknown> | undefined;
        return {
          content: [
            { type: "text" as const, text: `Image generated!\nModel: ${data.model || model}\nURL: ${data.url || task?.outputs?.[0] || "Processing..."}` },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "Failed"}` }], isError: true };
      }
    },
  );

  // Tool: Generate video
  server.tool(
    "generate_video",
    "Generate an AI video using xPilot. Supports text-to-video and image-to-video with Seedance, Wan, and Kling models.",
    {
      prompt: z.string().describe("Text description of the video to generate"),
      model: z.string().optional().describe("Model ID. Options: 'wan-2.2/t2v-480p-ultra-fast' (cheapest), 'seedance-v1.5-pro/text-to-video' (best quality). Default: wan-2.2"),
      duration: z.number().optional().describe("Video duration in seconds: 5 or 8. Default 5"),
      imageUrl: z.string().optional().describe("Input image URL for image-to-video mode"),
    },
    async ({ prompt, model, duration, imageUrl }) => {
      try {
        const modelId = model
          ? (model.includes("/") ? model : `wavespeed-ai/${model}`)
          : "wavespeed-ai/wan-2.2/t2v-480p-ultra-fast";
        const res = await fetch(`${baseUrl}/api/v1/video/generate`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt,
            modelId,
            duration: duration || 5,
            ...(imageUrl ? { imageUrl } : {}),
          }),
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (!res.ok) return { content: [{ type: "text" as const, text: `Error: ${data.error}` }], isError: true };
        const task = data.task as Record<string, unknown> | undefined;
        return {
          content: [
            { type: "text" as const, text: `Video task submitted!\nTask ID: ${task?.id || "unknown"}\nThe video will be auto-saved to your Materials when complete.` },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "Failed"}` }], isError: true };
      }
    },
  );

  // Tool: Generate text/post
  server.tool(
    "generate_post",
    "Generate a social media post using AI. Creates engaging content for X (Twitter) with optional image generation.",
    {
      prompt: z.string().describe("Topic or instructions for the post"),
      language: z.string().optional().describe("Language: 'en', 'zh', 'es', 'ja', 'ko'. Default 'en'"),
      model: z.string().optional().describe("Text model ID. Default uses free model"),
    },
    async ({ prompt, language, model }) => {
      try {
        const res = await fetch(`${baseUrl}/api/v1/text/generate`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: `Generate an engaging X (Twitter) post about: ${prompt}. Keep under 280 characters. Include 2-3 relevant hashtags.`,
            language: language || "en",
            modelId: model || undefined,
          }),
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (!res.ok) return { content: [{ type: "text" as const, text: `Error: ${data.error}` }], isError: true };
        return {
          content: [
            { type: "text" as const, text: `Generated post:\n\n${data.content || data.text || JSON.stringify(data)}` },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "Failed"}` }], isError: true };
      }
    },
  );

  // Tool: Check task status
  server.tool(
    "check_task",
    "Check the status of a video or image generation task on xPilot.",
    {
      taskId: z.string().describe("The task ID returned from generate_video or generate_image"),
      type: z.enum(["video", "image"]).optional().describe("Task type: 'video' or 'image'. Default 'video'"),
    },
    async ({ taskId, type }) => {
      try {
        const endpoint = type === "image" ? "image" : "video";
        const res = await fetch(`${baseUrl}/api/v1/${endpoint}/${taskId}`, { headers });
        const data = (await res.json()) as Record<string, unknown>;
        if (!res.ok) return { content: [{ type: "text" as const, text: `Error: ${data.error}` }], isError: true };
        const task = data.task as Record<string, unknown> | undefined;
        const outputs = task?.outputs as string[] | undefined;
        return {
          content: [
            { type: "text" as const, text: `Task ${taskId}:\nStatus: ${task?.status || "unknown"}\n${outputs?.[0] ? `Output: ${outputs[0]}` : "Still processing..."}${task?.error ? `\nError: ${task.error}` : ""}` },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "Failed"}` }], isError: true };
      }
    },
  );

  // Resource: Platform info
  server.resource(
    "platform-info",
    "xpilot://info",
    async () => ({
      contents: [{
        uri: "xpilot://info",
        mimeType: "text/plain",
        text: `xPilot — AI Social Media Marketing Automation Copilot

Website: ${baseUrl}
Models: 49 AI models (13 free)
Features: Auto-post to X, AI video/image generation, post-production, campaign management, analytics
Languages: English, Chinese, Spanish, Japanese, Korean
Pricing: Free to start with $5 credit

API Docs: ${baseUrl}/docs/api
Model Docs: ${baseUrl}/docs/models`,
      }],
    }),
  );

  return server;
}

// ── Worker entry ────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // GET / — MCP discovery (no auth required)
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      return corsResponse(
        Response.json({
          name: "xPilot MCP Server",
          version: "1.0.0",
          description: "AI Social Media Marketing Automation — generate images, videos, and posts with 49 AI models",
          tools: [
            { name: "list_models", description: "List all available AI models" },
            { name: "generate_image", description: "Generate AI image (13 free models available)" },
            { name: "generate_video", description: "Generate AI video (Seedance, Wan, Kling)" },
            { name: "generate_post", description: "Generate social media post for X" },
            { name: "check_task", description: "Check generation task status" },
          ],
          resources: [
            { name: "platform-info", uri: "xpilot://info", description: "xPilot platform information" },
          ],
          transport: "streamable-http",
          auth: { type: "bearer", header: "Authorization" },
        }),
      );
    }

    // POST / — MCP protocol requests (auth required)
    if (request.method === "POST" && (url.pathname === "/" || url.pathname === "")) {
      const authError = await verifyApiKey(request, env.BASE_URL);
      if (authError) return corsResponse(authError);

      try {
        const server = createMCPServer(env.BASE_URL, request.headers.get("authorization")!);
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless
        });

        await server.connect(transport);
        const body = await request.json();
        const response = await transport.handleRequest(body);

        return corsResponse(
          new Response(JSON.stringify(response), {
            headers: { "Content-Type": "application/json" },
          }),
        );
      } catch (e) {
        return corsResponse(
          Response.json(
            { error: { message: e instanceof Error ? e.message : "Internal error", code: "INTERNAL_ERROR" } },
            { status: 500 },
          ),
        );
      }
    }

    return corsResponse(new Response("Not Found", { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
