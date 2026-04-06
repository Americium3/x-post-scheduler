import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createXPilotMCPServer() {
  const server = new McpServer({
    name: "xPilot",
    version: "1.0.0",
  });

  const BASE_URL = process.env.NEXT_PUBLIC_APP_PUBLIC_URL || "https://xpilot.jytech.us";

  // ── Tool: List available AI models ──
  server.tool(
    "list_models",
    "List all available AI models on xPilot, grouped by category (text, image, video). Includes 13 free models.",
    {},
    async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/models`);
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : "Failed to list models"}` }], isError: true };
      }
    },
  );

  // ── Tool: Generate image ──
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
        const res = await fetch(`${BASE_URL}/api/v1/image/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            modelId: model ? `openrouter/black-forest-labs/${model}` : "openrouter/black-forest-labs/flux-2-pro",
            aspectRatio: aspectRatio || "1:1",
          }),
        });
        const data = await res.json();
        if (!res.ok) return { content: [{ type: "text", text: `Error: ${data.error}` }], isError: true };
        return {
          content: [
            { type: "text", text: `Image generated successfully!\nModel: ${data.model || model}\nURL: ${data.url || data.task?.outputs?.[0] || "Processing..."}` },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : "Failed"}` }], isError: true };
      }
    },
  );

  // ── Tool: Generate video ──
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
        const res = await fetch(`${BASE_URL}/api/v1/video/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            modelId,
            duration: duration || 5,
            ...(imageUrl ? { imageUrl } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) return { content: [{ type: "text", text: `Error: ${data.error}` }], isError: true };
        return {
          content: [
            { type: "text", text: `Video task submitted! Task is processing in the background.\nTask ID: ${data.task?.id || "unknown"}\nThe video will be auto-saved to your Materials when complete.` },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : "Failed"}` }], isError: true };
      }
    },
  );

  // ── Tool: Generate text/post ──
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
        const res = await fetch(`${BASE_URL}/api/v1/text/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Generate an engaging X (Twitter) post about: ${prompt}. Keep under 280 characters. Include 2-3 relevant hashtags.`,
            language: language || "en",
            modelId: model || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) return { content: [{ type: "text", text: `Error: ${data.error}` }], isError: true };
        return {
          content: [
            { type: "text", text: `Generated post:\n\n${data.content || data.text || JSON.stringify(data)}` },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : "Failed"}` }], isError: true };
      }
    },
  );

  // ── Tool: Check task status ──
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
        const res = await fetch(`${BASE_URL}/api/v1/${endpoint}/${taskId}`);
        const data = await res.json();
        if (!res.ok) return { content: [{ type: "text", text: `Error: ${data.error}` }], isError: true };
        const task = data.task;
        return {
          content: [
            { type: "text", text: `Task ${taskId}:\nStatus: ${task?.status || "unknown"}\n${task?.outputs?.[0] ? `Output: ${task.outputs[0]}` : "Still processing..."}${task?.error ? `\nError: ${task.error}` : ""}` },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : "Failed"}` }], isError: true };
      }
    },
  );

  // ── Resource: Platform info ──
  server.resource(
    "platform-info",
    "xpilot://info",
    async () => ({
      contents: [{
        uri: "xpilot://info",
        mimeType: "text/plain",
        text: `xPilot — AI Social Media Marketing Automation Copilot

Website: ${BASE_URL}
Models: 49 AI models (13 free)
Features: Auto-post to X, AI video/image generation, post-production, campaign management, analytics
Languages: English, Chinese, Spanish, Japanese, Korean
Pricing: Free to start with $5 credit

API Docs: ${BASE_URL}/docs/api
Model Docs: ${BASE_URL}/docs/models`,
      }],
    }),
  );

  return server;
}
