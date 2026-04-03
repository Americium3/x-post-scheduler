import { toPublicUrl } from "./public-url";
import type { VideoSubmitParams, VideoTask } from "./wavespeed";

const BYTEPLUS_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3";

function getApiKey(): string {
  const key = process.env.BYTEPLUSES_API_KEY;
  if (!key) throw new Error("Missing BYTEPLUSES_API_KEY");
  return key;
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const preview = text.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(
      `BytePlus API returned non-JSON (${res.status}): ${preview}`,
    );
  }
}

/**
 * Submit a video task to BytePluses (Seedance 1.5 Pro).
 * Supports both i2v (with image_url) and t2v (text only).
 */
export async function submitBytePlusVideoTask(
  params: VideoSubmitParams,
): Promise<VideoTask> {
  const key = getApiKey();
  const publicImageUrl = toPublicUrl(params.imageUrl);

  const duration = params.duration ?? 5;
  const cameraFixed = params.lockCamera ?? false;
  const enableAudio = params.generateAudio ?? false;

  // Build prompt with CLI-style flags appended
  let promptText = params.prompt || "";
  promptText += `  --duration ${duration} --camerafixed ${cameraFixed}`;
  if (enableAudio) {
    promptText += ` --enableaudio true`;
  }

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: promptText },
  ];

  // Add image for i2v mode
  if (publicImageUrl) {
    content.push({
      type: "image_url",
      image_url: { url: publicImageUrl },
    });
  }

  const body = {
    model: "ep-20260402095825-7tnfp",
    content,
  };

  const mode = publicImageUrl ? "i2v" : "t2v";
  console.log(`[BytePluses] Submitting ${mode} task to: ${BYTEPLUS_BASE}/contents/generations/tasks`);
  console.log(`[BytePlus] Request body:`, JSON.stringify(body, null, 2));

  const res = await fetch(`${BYTEPLUS_BASE}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  console.log(`[BytePlus] Response status: ${res.status}`);

  const json = await parseJsonSafe(res);
  if (!res.ok) {
    console.error(`[BytePlus] Error response:`, json);
    const errMsg = json.error as Record<string, unknown> | undefined;
    throw new Error(
      String(errMsg?.message ?? json.message ?? `BytePlus API error ${res.status}`),
    );
  }

  const taskId = json.id as string | undefined;
  if (!taskId) {
    throw new Error("BytePlus API did not return a task ID");
  }

  return {
    id: taskId,
    model: params.modelId,
    status: "processing",
    outputs: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Poll a BytePlus task for completion.
 *
 * GET /contents/generations/tasks/{id}
 */
export async function getBytePlusVideoTask(
  taskId: string,
): Promise<VideoTask> {
  const key = getApiKey();
  const url = `${BYTEPLUS_BASE}/contents/generations/tasks/${encodeURIComponent(taskId)}`;

  console.log(`[BytePlus] Polling task status from: ${url}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
  });

  console.log(`[BytePlus] Poll response status: ${res.status}`);

  const json = await parseJsonSafe(res);
  if (!res.ok) {
    console.error(`[BytePlus] Error polling task:`, json);
    const errMsg = json.error as Record<string, unknown> | undefined;
    throw new Error(
      String(errMsg?.message ?? json.message ?? `BytePlus API error ${res.status}`),
    );
  }

  console.log(`[BytePlus] Poll response body:`, JSON.stringify(json, null, 2));

  const status = String(json.status ?? "running").toLowerCase();

  if (status === "succeeded" || status === "completed") {
    // Extract video URL from the response — handle multiple response shapes
    let videoUrl: string | undefined;

    // Shape 1: { output: { content: [...] } }
    // Shape 2: { content: [...] }
    const output = json.output as Record<string, unknown> | undefined;
    const rawContent = output?.content ?? json.content;
    const content = Array.isArray(rawContent) ? rawContent : [];

    for (const item of content) {
      if (typeof item !== "object" || !item) continue;
      const entry = item as Record<string, unknown>;
      if (entry.type === "video_url") {
        const videoUrlObj = entry.video_url as Record<string, unknown> | undefined;
        videoUrl = videoUrlObj?.url as string | undefined;
        break;
      }
    }

    // Shape 3: direct URL in output
    if (!videoUrl && output?.video_url) {
      const obj = output.video_url as Record<string, unknown>;
      videoUrl = obj?.url as string | undefined;
    }
    if (!videoUrl && typeof output?.url === "string") {
      videoUrl = output.url as string;
    }

    return {
      id: taskId,
      model: "",
      status: "completed",
      outputs: videoUrl ? [videoUrl] : [],
      createdAt: "",
    };
  }

  if (status === "failed" || status === "error") {
    const errMsg = json.error as Record<string, unknown> | undefined;
    return {
      id: taskId,
      model: "",
      status: "failed",
      outputs: [],
      error: String(errMsg?.message ?? json.message ?? "Generation failed"),
      createdAt: "",
    };
  }

  // Still processing
  return {
    id: taskId,
    model: "",
    status: "processing",
    outputs: [],
    createdAt: "",
  };
}

// ── Model definitions ────────────────────────────────────────────────────────

// BytePluses is used as the primary provider for Seedance 1.5 Pro models.
// No separate model list needed — the existing Wavespeed Seedance 1.5 Pro
// models are transparently routed through BytePluses first.
export const BYTEPLUS_I2V_MODELS: { id: string; label: string; description: string; tier: "fast" | "standard" | "premium"; supportsAudio: boolean; durations: number[] }[] = [];
