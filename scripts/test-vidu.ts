/**
 * Smoke test for Vidu API.
 *
 * Submits one text-to-video task, polls until success/failed, prints the
 * resulting video URL. Use this to verify VIDU_API_KEY works before wiring
 * Vidu into the broader film-maker skill.
 *
 * Usage:
 *   npx tsx scripts/test-vidu.ts
 *   npx tsx scripts/test-vidu.ts "your custom prompt here"
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";

// Also load .env.local explicitly (Next.js convention)
loadEnv({ path: ".env.local" });

import { put } from "../lib/r2";

const API_KEY = process.env.VIDU_API_KEY;
if (!API_KEY) {
  console.error("ERROR: VIDU_API_KEY is not set in .env.local");
  process.exit(1);
}

const BASE = "https://api.vidu.com/ent/v2";
const PROMPT =
  process.argv[2] ||
  "A cinematic shot of a paper airplane gliding through a sunlit forest, soft golden light filtering through tall pine trees, slow motion, 4K";

type SubmitResponse = {
  task_id: string;
  state: string;
  model: string;
  prompt?: string;
  duration?: number;
  created_at?: string;
};

type PollResponse = {
  state: string;
  err_code?: string;
  creations?: { id: string; url: string; cover_url?: string }[];
  // Some Vidu responses use this shape:
  task_id?: string;
};

async function submitTask(): Promise<SubmitResponse> {
  console.log("→ Submitting Vidu text2video task...");
  console.log(`  Prompt: ${PROMPT}`);

  const body = {
    model: "viduq3-turbo",
    prompt: PROMPT,
    duration: 5,
    aspect_ratio: "16:9",
    resolution: "720p",
    style: "general",
    movement_amplitude: "auto",
  };

  const res = await fetch(`${BASE}/text2video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ Submit failed (${res.status}):`);
    console.error(text);
    process.exit(1);
  }

  const data = JSON.parse(text) as SubmitResponse;
  console.log(`✓ Submitted. task_id=${data.task_id}, state=${data.state}`);
  return data;
}

async function pollTask(taskId: string): Promise<PollResponse> {
  // Vidu uses /tasks/{id}/creations to get the final video URLs.
  const res = await fetch(`${BASE}/tasks/${taskId}/creations`, {
    headers: { Authorization: `Token ${API_KEY}` },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Poll failed (${res.status}): ${text}`);
  }
  return JSON.parse(text) as PollResponse;
}

async function main() {
  const submitted = await submitTask();
  const taskId = submitted.task_id;

  const startedAt = Date.now();
  const TIMEOUT_MS = 10 * 60 * 1000; // 10 min
  const POLL_INTERVAL_MS = 5000;

  console.log("→ Polling task status (every 5s, timeout 10min)...");

  while (Date.now() - startedAt < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    let poll: PollResponse;
    try {
      poll = await pollTask(taskId);
    } catch (e) {
      console.error(`  ! poll error: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`  [${elapsed}s] state=${poll.state}`);

    if (poll.state === "success") {
      console.log("\n✓ Generation complete!");
      if (!poll.creations || poll.creations.length === 0) {
        console.log("  (No creations array — full response:)");
        console.log(JSON.stringify(poll, null, 2));
        return;
      }

      for (const c of poll.creations) {
        // IMPORTANT: download using the ORIGINAL URL — CloudFront signed
        // the literal `;` so any encoding (e.g. `;` → `%3B`) breaks the
        // signature. The semicolon is valid in a query string per RFC 3986;
        // Node fetch and curl handle it correctly. Only browsers/some
        // downloaders misparse it, so we mirror to R2 to sidestep the issue.
        console.log(`  Vidu URL: ${c.url}`);

        console.log("  → Downloading from Vidu...");
        const dlRes = await fetch(c.url);
        if (!dlRes.ok) {
          console.error(`  ✗ Download failed: ${dlRes.status} ${dlRes.statusText}`);
          continue;
        }
        const buf = Buffer.from(await dlRes.arrayBuffer());
        console.log(`  ✓ Downloaded ${(buf.length / 1024 / 1024).toFixed(2)} MB`);

        console.log("  → Uploading to R2 (demo/vidu/)...");
        const r2Path = `demo/vidu/${taskId}-${c.id}.mp4`;
        const uploaded = await put(r2Path, buf, {
          contentType: "video/mp4",
          addRandomSuffix: false,
        });
        console.log(`  ✓ R2 URL:   ${uploaded.url}`);

        if (c.cover_url) {
          console.log("  → Uploading cover to R2...");
          const coverRes = await fetch(c.cover_url);
          if (coverRes.ok) {
            const coverBuf = Buffer.from(await coverRes.arrayBuffer());
            const coverPath = `demo/vidu/${taskId}-${c.id}-cover.jpg`;
            const coverUploaded = await put(coverPath, coverBuf, {
              contentType: "image/jpeg",
              addRandomSuffix: false,
            });
            console.log(`  ✓ Cover:    ${coverUploaded.url}`);
          }
        }
      }
      return;
    }

    if (poll.state === "failed") {
      console.error(`\n✗ Generation failed: ${poll.err_code || "unknown"}`);
      console.error(JSON.stringify(poll, null, 2));
      process.exit(1);
    }
  }

  console.error("\n✗ Timed out after 10 minutes");
  process.exit(1);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
