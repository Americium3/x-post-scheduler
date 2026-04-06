interface Env {
  APP_BASE_URL: string;
  CRON_SECRET?: string;
  AUTOCLAW_WORKER_URL?: string;
  AUTOCLAW_WORKER_SECRET?: string;
}

interface ScheduledController {
  cron: string;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

function toAbsoluteUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${path}`;
}

async function triggerEndpoint(env: Env, path: string): Promise<Response> {
  const headers: HeadersInit = {
    "content-type": "application/json",
    "user-agent": "cloudflare-cron/xpilot",
  };

  if (env.CRON_SECRET) {
    headers.authorization = `Bearer ${env.CRON_SECRET}`;
  }

  const url = toAbsoluteUrl(env.APP_BASE_URL, path);
  return fetch(url, {
    method: "POST",
    headers,
    body: "{}",
  });
}

async function safeTrigger(env: Env, label: string, path: string): Promise<void> {
  const res = await triggerEndpoint(env, path);
  if (!res.ok) {
    const body = await res.text();
    console.error(`${label} failed (${res.status}): ${body}`);
  }
}

const worker = {
  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: WorkerExecutionContext,
  ): Promise<void> {
    if (!env.APP_BASE_URL) {
      throw new Error("Missing APP_BASE_URL worker secret/var.");
    }

    // Determine which slot we're in based on current UTC hour
    const hour = new Date().getUTCHours();

    ctx.waitUntil(
      (async () => {
        // Every slot (every 2 min): poll background media tasks
        await safeTrigger(env, "MediaTasks", "/api/toolbox/tasks/process");

        // Daily slots (01:00, 13:00, 23:00 UTC): scheduled posts + daily jobs
        if (hour === 1 || hour === 13 || hour === 23) {
          await safeTrigger(env, "Scheduler", "/api/scheduler");
        }

        // Process recurring YouTube schedules
        await safeTrigger(env, "Recurring-YouTube", "/api/cron/recurring-youtube");

        // Slot 1 (UTC 01:00): Full daily pipeline
        if (hour === 1) {
          // Generate daily content for users
          await safeTrigger(env, "Daily-generate", "/api/daily-generate");

          // Daily media industry news
          await safeTrigger(env, "Media-news-daily", "/api/cron/media-news?period=daily");

          // Weekly media news on Mondays
          if (new Date().getUTCDay() === 1) {
            await safeTrigger(env, "Media-news-weekly", "/api/cron/media-news?period=weekly");
          }

          // Daily follower snapshot for growth tracking
          await safeTrigger(env, "Snapshot-followers", "/api/cron/snapshot-followers");

          // AutoClaw: run next pending task for all active marketing agents
          if (env.AUTOCLAW_WORKER_URL && env.AUTOCLAW_WORKER_SECRET) {
            const acRes = await fetch(`${env.AUTOCLAW_WORKER_URL}/cron`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.AUTOCLAW_WORKER_SECRET}`,
              },
            });
            if (!acRes.ok) {
              const body = await acRes.text();
              console.error(`AutoClaw cron failed (${acRes.status}): ${body}`);
            } else {
              console.log("AutoClaw cron triggered successfully");
            }
          }
        }

        // Slot 2 (UTC 13:00): Only scheduler runs (no additional tasks)

        // Slot 3 (UTC 23:00): Media-X reports
        if (hour === 23) {
          // Daily Media-X report
          await safeTrigger(env, "Media-X-daily", "/api/cron/media-x?period=daily");

          // Weekly Media-X report on Sundays
          if (new Date().getUTCDay() === 0) {
            await safeTrigger(env, "Media-X-weekly", "/api/cron/media-x?period=weekly");
          }
        }

        // Note: Tweet metrics sync + content profile auto-refresh happens when
        // users manually sync via POST /api/analytics/sync-tweet-metrics.
        // The follower snapshot cron (Slot 1) tracks growth data automatically.
      })(),
    );
  },
};

export default worker;
