type CronLogInput = {
  jobName: string;
  endpoint: string;
  method?: string;
  success: boolean;
  statusCode?: number;
  durationMs?: number;
  triggeredBy?: string;
  error?: string;
  metadata?: unknown;
};

const BETTER_STACK_URL = "https://in.logs.betterstack.com";

async function sendToBetterStack(payload: Record<string, unknown>) {
  const apiKey = process.env.BETTER_STACK_API_KEY;
  if (!apiKey) {
    console.log("[cron-log]", JSON.stringify(payload));
    return;
  }

  try {
    await fetch(BETTER_STACK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[cron-log] Failed to send to Better Stack:", err);
    console.log("[cron-log]", JSON.stringify(payload));
  }
}

export async function logCronRun(input: CronLogInput) {
  const payload = {
    dt: new Date().toISOString(),
    level: input.success ? "info" : "error",
    message: `[${input.jobName}] ${input.success ? "OK" : "FAIL"} ${input.statusCode ?? ""}`.trim(),
    jobName: input.jobName,
    endpoint: input.endpoint,
    method: input.method ?? "POST",
    success: input.success,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
    triggeredBy: input.triggeredBy,
    error: input.error ?? null,
    metadata: input.metadata ?? null,
  };

  await sendToBetterStack(payload);
}

export function detectCronTrigger(request: Request): string {
  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  if (userAgent.includes("cloudflare-cron")) return "cloudflare";
  if (request.headers.has("x-vercel-id")) return "vercel";
  return "manual";
}
