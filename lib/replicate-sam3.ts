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

export interface SAMTrackInput {
  /** Public video URL accessible by Replicate */
  videoUrl: string;
  /** Click coordinates as pixel [x,y] pairs on the video frame */
  clickPoints: { x: number; y: number }[];
  /** 1 = foreground (track this), 0 = background (avoid this) */
  clickLabels?: number[];
  /** Frame index for each click point (default: all frame 0) */
  clickFrames?: number[];
  /** Object label for clicks */
  objectLabel?: string;
}

export interface SAMTrackResult {
  /** URL of the mask video (black & white) */
  maskVideoUrl: string;
  status: "succeeded" | "failed";
  error?: string;
}

/**
 * Run SAM2 video segmentation on Replicate (meta/sam-2-video).
 * User clicks on an object in the first frame, SAM2 tracks it across all frames.
 */
export async function runSAMVideoSegmentation(
  input: SAMTrackInput,
): Promise<SAMTrackResult> {
  const client = getClient();

  if (!input.clickPoints.length) {
    return { maskVideoUrl: "", status: "failed", error: "At least one click point is required" };
  }

  console.log(`[SAM2] Starting tracking: ${input.clickPoints.length} points, frames: ${input.clickFrames?.join(",") ?? "0"}`);

  try {
    const coordinates = input.clickPoints
      .map((p) => `[${Math.round(p.x)},${Math.round(p.y)}]`)
      .join(",");

    const labels = (input.clickLabels ?? input.clickPoints.map(() => 1)).join(",");
    const frames = input.clickFrames
      ? input.clickFrames.map(String).join(",")
      : input.clickPoints.map(() => "0").join(",");

    const replicateInput: Record<string, unknown> = {
      input_video: input.videoUrl,
      click_coordinates: coordinates,
      click_labels: labels,
      click_frames: frames,
      mask_type: "binary",
      output_video: true,
    };

    if (input.objectLabel) {
      replicateInput.click_object_ids = input.clickPoints
        .map(() => input.objectLabel)
        .join(",");
    }

    console.log(`[SAM2] Replicate input:`, JSON.stringify(replicateInput, null, 2));

    const output = await client.run("meta/sam-2-video:33432afdfc06a10da6b4018932893d39b0159f838b6d11dd1236dff85cc5ec1d" as `${string}/${string}:${string}`, {
      input: replicateInput,
    });

    console.log(`[SAM2] Raw output type:`, typeof output, `value:`, JSON.stringify(output)?.slice(0, 200));

    // Replicate FileOutput objects have an href property with the actual URL.
    // They also serialize to the URL string via Symbol.toPrimitive / toString.
    let maskUrl: string | undefined;

    function extractUrl(val: unknown): string | undefined {
      if (!val) return undefined;
      if (typeof val === "string") return val.startsWith("http") ? val : undefined;
      if (typeof val === "object") {
        const obj = val as Record<string, unknown>;
        // FileOutput has .href (string) as the actual URL
        if (typeof obj.href === "string") return obj.href;
        // Try .url if it's a string (not a function)
        if (typeof obj.url === "string") return obj.url;
      }
      // Last resort: toString() — FileOutput implements this
      const str = `${val}`;
      return str.startsWith("http") ? str : undefined;
    }

    if (Array.isArray(output)) {
      maskUrl = extractUrl(output[0]);
    } else {
      maskUrl = extractUrl(output);
    }

    if (!maskUrl) {
      console.error(`[SAM2] No mask URL in output:`, output);
      return { maskVideoUrl: "", status: "failed", error: "No mask output returned" };
    }

    console.log(`[SAM2] Mask video: ${maskUrl}`);
    return { maskVideoUrl: maskUrl, status: "succeeded" };
  } catch (err) {
    console.error(`[SAM2] Error:`, err);
    return {
      maskVideoUrl: "",
      status: "failed",
      error: err instanceof Error ? err.message : "Video segmentation failed",
    };
  }
}
