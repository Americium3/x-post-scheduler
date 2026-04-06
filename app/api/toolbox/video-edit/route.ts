import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { runVideoEdit } from "@/lib/replicate-video-edit";
import { put } from "@/lib/r2";
import { prisma } from "@/lib/db";
import ffmpeg from "fluent-ffmpeg";
import explicitFfmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

// Configure ffmpeg
let ffmpegPath = explicitFfmpegPath;
if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
  const localPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
  if (fs.existsSync(localPath)) ffmpegPath = localPath;
}
if (ffmpegPath && fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);

export const maxDuration = 300;

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(Number(metadata.format.duration) || 0);
    });
  });
}

function trimVideo(inputPath: string, outputPath: string, maxDur: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(["-t", String(maxDur), "-c", "copy", "-movflags", "+faststart"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { videoUrl, prompt, referenceImageUrl, background } = body as {
    videoUrl: string;
    prompt: string;
    referenceImageUrl?: string;
    background?: boolean;
  };

  if (!videoUrl || !prompt) {
    return NextResponse.json({ error: "videoUrl and prompt are required" }, { status: 400 });
  }

  // Background mode: save task to DB, return immediately
  if (background) {
    try {
      const task = await prisma.mediaTask.create({
        data: {
          userId: user.id,
          type: "video",
          modelId: "wan-2.7-videoedit",
          modelLabel: "AI Edit (Wan 2.7)",
          prompt,
          mode: "ai-edit",
          status: "pending",
          provider: "replicate",
          providerTaskId: null,
          providerPollUrl: JSON.stringify({ videoUrl, prompt, referenceImageUrl }),
          inputImageUrl: referenceImageUrl ?? null,
        },
      });
      return NextResponse.json({ taskId: task.id });
    } catch (err) {
      console.error("[video-edit] Background task creation failed:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to create task" },
        { status: 500 },
      );
    }
  }

  const tempDir = os.tmpdir();
  const uid = randomUUID();
  const downloadPath = path.join(tempDir, `edit-in-${uid}.mp4`);
  const trimmedPath = path.join(tempDir, `edit-trim-${uid}.mp4`);
  const tempFiles = [downloadPath, trimmedPath];

  try {
    // Download video to check duration
    const resp = await fetch(videoUrl);
    if (!resp.ok) throw new Error("Failed to download video");
    fs.writeFileSync(downloadPath, Buffer.from(await resp.arrayBuffer()));

    const duration = await probeDuration(downloadPath);
    console.log(`[video-edit] Input duration: ${duration.toFixed(1)}s`);

    // Wan 2.7 VideoEdit accepts 2-10s — trim if needed
    let editVideoUrl = videoUrl;
    if (duration > 10) {
      console.log(`[video-edit] Trimming to 10s...`);
      await trimVideo(downloadPath, trimmedPath, 10);
      // Upload trimmed video to R2 for Replicate access
      const trimmedBuffer = fs.readFileSync(trimmedPath);
      const uploaded = await put(`video-edit/${user.id}/trimmed-${Date.now()}.mp4`, trimmedBuffer, {
        contentType: "video/mp4",
        addRandomSuffix: false,
      });
      editVideoUrl = uploaded.url;
      console.log(`[video-edit] Trimmed video uploaded: ${editVideoUrl}`);
    }

    if (duration < 2) {
      return NextResponse.json(
        { error: "Video must be at least 2 seconds long" },
        { status: 400 },
      );
    }

    const editDuration = Math.max(2, Math.min(10, Math.round(duration > 10 ? 10 : duration)));
    console.log(`[video-edit] Calling Wan 2.7: url=${editVideoUrl.slice(0, 60)}..., duration=${editDuration}s, prompt="${prompt.slice(0, 50)}"`);

    const result = await runVideoEdit({
      videoUrl: editVideoUrl,
      prompt,
      referenceImageUrl,
      duration: editDuration,
    });

    if (result.status === "failed") {
      return NextResponse.json({ error: result.error ?? "Edit failed" }, { status: 500 });
    }

    // Persist to R2
    let persistedUrl = result.outputUrl;
    try {
      const outResp = await fetch(result.outputUrl);
      if (outResp.ok) {
        const buffer = Buffer.from(await outResp.arrayBuffer());
        const uploaded = await put(`video-edit/${user.id}/${Date.now()}.mp4`, buffer, {
          contentType: "video/mp4",
          addRandomSuffix: false,
        });
        persistedUrl = uploaded.url;
      }
    } catch (e) {
      console.error("[video-edit] R2 persist failed:", e);
    }

    return NextResponse.json({ url: persistedUrl });
  } catch (err) {
    console.error("[video-edit] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Video edit failed" },
      { status: 500 },
    );
  } finally {
    for (const f of tempFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    }
  }
}
