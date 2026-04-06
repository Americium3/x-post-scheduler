import Replicate from "replicate";

let _client: Replicate | null = null;

function getClient(): Replicate {
  if (!_client) {
    const token = process.env.REPLICATE_API_KEY;
    if (!token) throw new Error("Missing REPLICATE_API_KEY");
    _client = new Replicate({ auth: token });
  }
  return _client;
}

function extractUrl(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") return val.startsWith("http") ? val : undefined;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.href === "string") return obj.href;
    if (typeof obj.url === "string") return obj.url;
  }
  const str = `${val}`;
  return str.startsWith("http") ? str : undefined;
}

// ── Wan 2.7 VideoEdit ────────────────────────────────────────────────────────

export interface VideoEditInput {
  videoUrl: string;
  prompt: string;
  referenceImageUrl?: string;
  duration?: number;
  resolution?: string;
}

export interface VideoEditResult {
  outputUrl: string;
  status: "succeeded" | "failed";
  error?: string;
}

/**
 * Edit a video with natural language instructions using Wan 2.7 VideoEdit.
 * Examples:
 *   "Replace the phone screen with a cat video"
 *   "Change the background to a beach scene"
 *   "Make everything look like a watercolor painting"
 */
export async function runVideoEdit(input: VideoEditInput): Promise<VideoEditResult> {
  const client = getClient();
  console.log(`[VideoEdit] Prompt: "${input.prompt}", video: ${input.videoUrl.slice(0, 60)}...`);

  try {
    const replicateInput: Record<string, unknown> = {
      video: input.videoUrl,
      prompt: input.prompt,
    };
    if (input.referenceImageUrl) {
      replicateInput.reference_image = input.referenceImageUrl;
    }
    if (input.duration) {
      replicateInput.duration = input.duration;
    }
    if (input.resolution) {
      replicateInput.resolution = input.resolution;
    }

    console.log(`[VideoEdit] Replicate input:`, JSON.stringify(replicateInput, null, 2));

    const output = await client.run(
      "wan-video/wan-2.7-videoedit" as `${string}/${string}`,
      { input: replicateInput },
    );

    let url: string | undefined;
    if (Array.isArray(output)) {
      url = extractUrl(output[0]);
    } else {
      url = extractUrl(output);
    }

    if (!url) {
      console.error(`[VideoEdit] No output URL:`, output);
      return { outputUrl: "", status: "failed", error: "No output returned" };
    }

    console.log(`[VideoEdit] Output: ${url}`);
    return { outputUrl: url, status: "succeeded" };
  } catch (err) {
    console.error(`[VideoEdit] Error:`, err);
    return {
      outputUrl: "",
      status: "failed",
      error: err instanceof Error ? err.message : "Video edit failed",
    };
  }
}

// ── Wan 2.7 R2V (Reference-to-Video) ────────────────────────────────────────

export interface R2VInput {
  prompt: string;
  referenceImageUrls?: string[];
  referenceVideoUrls?: string[];
  duration?: number;
  aspectRatio?: string;
}

export interface R2VResult {
  outputUrl: string;
  status: "succeeded" | "failed";
  error?: string;
}

/**
 * Generate a video featuring a specific character/object from reference images/videos.
 * Good for: "Make this product appear in a commercial" type use cases.
 */
export async function runR2V(input: R2VInput): Promise<R2VResult> {
  const client = getClient();
  console.log(`[R2V] Prompt: "${input.prompt}", refs: ${input.referenceImageUrls?.length ?? 0} images, ${input.referenceVideoUrls?.length ?? 0} videos`);

  try {
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    };
    if (input.referenceImageUrls?.length) {
      replicateInput.reference_images = input.referenceImageUrls.join(",");
    }
    if (input.referenceVideoUrls?.length) {
      replicateInput.reference_videos = input.referenceVideoUrls.join(",");
    }
    if (input.duration) replicateInput.duration = input.duration;
    if (input.aspectRatio) replicateInput.aspect_ratio = input.aspectRatio;

    const output = await client.run(
      "wan-video/wan-2.7-r2v" as `${string}/${string}`,
      { input: replicateInput },
    );

    let url: string | undefined;
    if (Array.isArray(output)) {
      url = extractUrl(output[0]);
    } else {
      url = extractUrl(output);
    }

    if (!url) {
      return { outputUrl: "", status: "failed", error: "No output returned" };
    }

    console.log(`[R2V] Output: ${url}`);
    return { outputUrl: url, status: "succeeded" };
  } catch (err) {
    console.error(`[R2V] Error:`, err);
    return {
      outputUrl: "",
      status: "failed",
      error: err instanceof Error ? err.message : "R2V generation failed",
    };
  }
}
