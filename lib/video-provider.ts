import {
  submitVideoTask as submitWavespeed,
  getVideoTask as getWavespeed,
} from "./wavespeed";
import type { VideoSubmitParams, VideoTask } from "./wavespeed";
import {
  submitSeedanceVideoTask,
  getSeedanceVideoTask,
} from "./seedance";
import {
  submitBytePlusVideoTask,
  getBytePlusVideoTask,
} from "./bytepluses";

export type VideoProvider = "wavespeed" | "seedance" | "byteplus";

export interface VideoProviderOptions {
  userSeedanceKey?: string;
}

/** Seedance 1.5 Pro model IDs that should be routed through BytePluses first */
const BYTEPLUSES_ELIGIBLE = [
  "bytedance/seedance-v1.5-pro/text-to-video",
  "bytedance/seedance-v1.5-pro/image-to-video",
];

function isBytePlusesEligible(modelId: string): boolean {
  return BYTEPLUSES_ELIGIBLE.includes(modelId) && !!process.env.BYTEPLUSES_API_KEY;
}

export function detectVideoProvider(modelId: string): VideoProvider {
  if (modelId.startsWith("seedance-2.0/")) return "seedance";
  if (isBytePlusesEligible(modelId)) return "byteplus";
  return "wavespeed";
}

export async function submitVideo(
  params: VideoSubmitParams,
  options?: VideoProviderOptions,
): Promise<VideoTask> {
  const provider = detectVideoProvider(params.modelId);

  if (provider === "seedance") {
    return submitSeedanceVideoTask(params, options?.userSeedanceKey);
  }

  // BytePluses primary → Wavespeed fallback for Seedance 1.5 Pro
  if (provider === "byteplus") {
    try {
      console.log(`[VideoProvider] Trying BytePluses for ${params.modelId}...`);
      return await submitBytePlusVideoTask(params);
    } catch (err) {
      console.warn(`[VideoProvider] BytePluses failed, falling back to Wavespeed:`, err instanceof Error ? err.message : err);
      return submitWavespeed(params);
    }
  }

  return submitWavespeed(params);
}

export async function pollVideo(
  taskIdOrUrl: string,
  provider: VideoProvider,
  options?: VideoProviderOptions,
): Promise<VideoTask> {
  if (provider === "seedance") {
    return getSeedanceVideoTask(taskIdOrUrl, options?.userSeedanceKey);
  }
  if (provider === "byteplus") {
    return getBytePlusVideoTask(taskIdOrUrl);
  }
  return getWavespeed(taskIdOrUrl);
}
