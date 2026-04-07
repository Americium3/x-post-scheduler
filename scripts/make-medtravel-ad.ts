/**
 * MedTravel China — 30-second ad video generator.
 *
 * Pipeline:
 *   1. Submit 4 Vidu text2video tasks in parallel
 *   2. Poll all in parallel until success
 *   3. Download each clip from Vidu (original URL — don't encode `;`)
 *   4. Upload each to R2: demo/medical-tourism-ad/shot-N.mp4
 *   5. Concatenate locally with ffmpeg
 *   6. Upload final cut to R2: demo/medical-tourism-ad/medtravel-final.mp4
 *
 * Usage:
 *   npx tsx scripts/make-medtravel-ad.ts
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { put } from "../lib/r2";
import { writeFileSync, readFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFileSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

const API_KEY = process.env.VIDU_API_KEY;
if (!API_KEY) {
  console.error("ERROR: VIDU_API_KEY is not set in .env.local");
  process.exit(1);
}

const BASE = "https://api.vidu.com/ent/v2";

const SHOTS: { name: string; duration: number; prompt: string }[] = [
  {
    name: "shot-1-sticker-shock",
    duration: 8,
    prompt:
      "A middle-aged American man sits in a modern American dental clinic " +
      "consultation room, holding a treatment estimate paper. His face shows " +
      "shock and worry. Cool clinical white lighting, blue scrubs in soft " +
      "focus background. Cinematic, shallow depth of field, slow push-in on " +
      "his concerned face.",
  },
  {
    name: "shot-2-nanning-clinic",
    duration: 8,
    prompt:
      "A bright, ultra-modern dental clinic interior in Nanning, China. " +
      "Spacious lobby with floor-to-ceiling windows, polished wood and white " +
      "marble, lush tropical plants. A friendly Chinese dental coordinator " +
      "in a crisp white coat warmly welcomes a Western patient at a sleek " +
      "reception desk. State-of-the-art 3D dental imaging equipment visible " +
      "in background. Warm professional lighting, cinematic, 4K.",
  },
  {
    name: "shot-3-bama-wellness",
    duration: 8,
    prompt:
      "A serene wellness retreat in Bama, Guangxi China. A patient relaxes " +
      "in a traditional Chinese herbal bath in a beautiful wooden tub " +
      "overlooking misty karst mountain landscapes of Guilin in the distance. " +
      "Steam rises gently, soft green tea served on a stone tray. Warm " +
      "golden hour light, peaceful and healing atmosphere, cinematic wide shot.",
  },
  {
    name: "shot-4-detian-triumph",
    duration: 6,
    prompt:
      "A happy middle-aged American man with a bright confident smile stands " +
      "with his wife in front of the spectacular Detian Waterfall on the " +
      "China-Vietnam border. Lush green jungle, massive cascading waterfall " +
      "behind them, mist in the air. Both laughing and embracing. Slow " +
      "motion, golden hour, lens flare, triumphant cinematic ending.",
  },
];

async function submit(prompt: string, duration: number): Promise<string> {
  const res = await fetch(`${BASE}/text2video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "viduq3-turbo",
      prompt,
      duration,
      aspect_ratio: "16:9",
      resolution: "720p",
      style: "general",
      movement_amplitude: "auto",
    }),
  });
  if (!res.ok) {
    throw new Error(`Submit failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { task_id: string };
  return data.task_id;
}

type PollResult = { url: string; cover_url?: string; credits?: number };

async function poll(taskId: string, label: string): Promise<PollResult> {
  const startedAt = Date.now();
  const TIMEOUT_MS = 15 * 60 * 1000;
  let lastState = "";

  while (Date.now() - startedAt < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 5000));

    let res: Response;
    try {
      res = await fetch(`${BASE}/tasks/${taskId}/creations`, {
        headers: { Authorization: `Token ${API_KEY}` },
      });
    } catch (e) {
      console.log(`  [${label}] poll error: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    if (!res.ok) continue;

    const data = (await res.json()) as {
      state: string;
      err_code?: string;
      credits?: number;
      creations?: { id: string; url: string; cover_url?: string }[];
    };

    if (data.state !== lastState) {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      console.log(`  [${label}] [${elapsed}s] state=${data.state}`);
      lastState = data.state;
    }

    if (data.state === "success") {
      const c = data.creations?.[0];
      if (!c) throw new Error(`Task ${taskId} success but no creations`);
      return { url: c.url, cover_url: c.cover_url, credits: data.credits };
    }
    if (data.state === "failed") {
      throw new Error(`Task ${taskId} failed: ${data.err_code || "unknown"}`);
    }
  }
  throw new Error(`Task ${taskId} timed out after 15min`);
}

async function main() {
  console.log("=== MedTravel China — 30s Ad Generation ===\n");
  const overallStart = Date.now();

  // 1. Submit all 4 in parallel
  console.log("→ Submitting 4 shots in parallel...");
  const taskIds = await Promise.all(
    SHOTS.map(async (s) => {
      const id = await submit(s.prompt, s.duration);
      console.log(`  ✓ ${s.name}: task_id=${id}`);
      return id;
    }),
  );

  // 2. Poll all in parallel
  console.log("\n→ Polling all tasks (parallel)...");
  const results = await Promise.all(
    taskIds.map((id, i) => poll(id, SHOTS[i].name)),
  );

  // 3. Download each + upload to R2
  const tmp = mkdtempSync(join(tmpdir(), "medtravel-"));
  const localPaths: string[] = [];
  let totalCredits = 0;
  const r2Urls: string[] = [];

  for (let i = 0; i < SHOTS.length; i++) {
    const shot = SHOTS[i];
    const result = results[i];
    totalCredits += result.credits || 0;

    console.log(`\n→ Processing ${shot.name} (${result.credits} credits)...`);
    const dlRes = await fetch(result.url);
    if (!dlRes.ok) {
      throw new Error(`Download failed for ${shot.name}: ${dlRes.status}`);
    }
    const buf = Buffer.from(await dlRes.arrayBuffer());
    console.log(`  ✓ Downloaded ${(buf.length / 1024 / 1024).toFixed(2)} MB`);

    const localPath = join(tmp, `${shot.name}.mp4`);
    writeFileSync(localPath, buf);
    localPaths.push(localPath);

    const uploaded = await put(
      `demo/medical-tourism-ad/${shot.name}.mp4`,
      buf,
      { contentType: "video/mp4", addRandomSuffix: false },
    );
    r2Urls.push(uploaded.url);
    console.log(`  ✓ R2: ${uploaded.url}`);
  }

  // 4. Concat with ffmpeg
  console.log("\n→ Concatenating with ffmpeg...");
  const listPath = join(tmp, "concat.txt");
  writeFileSync(
    listPath,
    localPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"),
  );
  const finalLocal = join(tmp, "medtravel-final.mp4");

  const ffmpeg = ffmpegPath || "ffmpeg";
  try {
    // Try fast path first: stream copy (works if all clips share codec params)
    execFileSync(
      ffmpeg,
      ["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-y", finalLocal],
      { stdio: "pipe" },
    );
    console.log("  ✓ Concat (stream copy)");
  } catch {
    // Fallback: re-encode
    console.log("  ! Stream copy failed, re-encoding...");
    execFileSync(
      ffmpeg,
      [
        "-f", "concat", "-safe", "0", "-i", listPath,
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        "-y", finalLocal,
      ],
      { stdio: "pipe" },
    );
    console.log("  ✓ Concat (re-encoded)");
  }

  const finalBuf = readFileSync(finalLocal);
  console.log(`  ✓ Final size: ${(finalBuf.length / 1024 / 1024).toFixed(2)} MB`);

  const finalUploaded = await put(
    "demo/medical-tourism-ad/medtravel-final.mp4",
    finalBuf,
    { contentType: "video/mp4", addRandomSuffix: false },
  );

  // 5. Summary
  const totalSec = Math.round((Date.now() - overallStart) / 1000);
  console.log("\n========================================");
  console.log("✓ MedTravel China ad complete");
  console.log("========================================");
  console.log(`Total time:    ${Math.floor(totalSec / 60)}m ${totalSec % 60}s`);
  console.log(`Total credits: ${totalCredits} (≈ $${(totalCredits / 100).toFixed(2)})`);
  console.log("\nIndividual shots:");
  for (let i = 0; i < r2Urls.length; i++) {
    console.log(`  ${SHOTS[i].name}: ${r2Urls[i]}`);
  }
  console.log(`\n🎬 Final ad: ${finalUploaded.url}`);
}

main().catch((e) => {
  console.error("\nFatal error:", e);
  process.exit(1);
});
