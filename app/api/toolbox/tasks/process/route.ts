import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pollVideo, type VideoProvider } from "@/lib/video-provider";
import { runVideoEdit } from "@/lib/replicate-video-edit";
import { saveToGallery } from "@/lib/gallery";
import { put } from "@/lib/r2";

const MAX_POLL_ATTEMPTS = 120; // ~10 min at 5s intervals

/**
 * POST /api/toolbox/tasks/process — poll all pending/processing tasks
 * Called by Cloudflare Worker cron or manually.
 * Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.mediaTask.findMany({
    where: {
      status: { in: ["pending", "processing"] },
      pollAttempts: { lt: MAX_POLL_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  if (tasks.length === 0) {
    return NextResponse.json({ processed: 0, message: "No pending tasks" });
  }

  console.log(`[TaskProcessor] Processing ${tasks.length} tasks...`);

  let completed = 0;
  let failed = 0;
  let stillProcessing = 0;

  for (const task of tasks) {
    try {
      // Handle AI Edit background tasks
      if (task.mode === "ai-edit" && !task.providerTaskId) {
        console.log(`[TaskProcessor] Running AI Edit task ${task.id}`);
        await prisma.mediaTask.update({ where: { id: task.id }, data: { status: "processing" } });
        try {
          const params = JSON.parse(task.providerPollUrl ?? "{}");
          const editResult = await runVideoEdit({
            videoUrl: params.videoUrl,
            prompt: params.prompt,
            referenceImageUrl: params.referenceImageUrl,
          });
          if (editResult.status === "failed") throw new Error(editResult.error);
          // Persist to R2
          let url = editResult.outputUrl;
          try {
            const resp = await fetch(editResult.outputUrl);
            if (resp.ok) {
              const buf = Buffer.from(await resp.arrayBuffer());
              const up = await put(`video-edit/${task.userId}/${Date.now()}.mp4`, buf, { contentType: "video/mp4", addRandomSuffix: false });
              url = up.url;
            }
          } catch {}
          await prisma.mediaTask.update({ where: { id: task.id }, data: { status: "completed", outputUrl: url, completedAt: new Date() } });
          await saveToGallery({ userId: task.userId, type: "video", modelId: "wan-2.7-videoedit", modelLabel: "AI Edit (Wan 2.7)", prompt: task.prompt, sourceUrl: url, isPublic: false });
          completed++;
        } catch (err) {
          await prisma.mediaTask.update({ where: { id: task.id }, data: { status: "failed", error: err instanceof Error ? err.message : "AI edit failed" } });
          failed++;
        }
        continue;
      }

      // Handle Post-production background tasks (call the sync endpoint internally)
      if (task.mode === "post-production" && !task.providerTaskId) {
        console.log(`[TaskProcessor] Running post-production task ${task.id}`);
        await prisma.mediaTask.update({ where: { id: task.id }, data: { status: "processing" } });
        try {
          const params = JSON.parse(task.providerPollUrl ?? "{}");
          // Call our own post-production endpoint synchronously via internal fetch
          const baseUrl = process.env.NEXT_PUBLIC_APP_PUBLIC_URL || process.env.APP_BASE_URL || "http://localhost:3000";
          const form = new FormData();
          form.append("videoUrl", params.sourceVideoUrl);
          form.append("textOverlays", params.textOverlays ?? "[]");
          form.append("masks", params.masks ?? "[]");
          form.append("videoDims", params.videoDims ?? '{"w":1280,"h":720}');
          if (params.sam3MaskUrl) form.append("sam3MaskUrl", params.sam3MaskUrl);
          if (params.replaceUrl) {
            // Download replacement and re-attach as file
            const rResp = await fetch(params.replaceUrl);
            if (rResp.ok) {
              const rBuf = Buffer.from(await rResp.arrayBuffer());
              const rBlob = new Blob([rBuf], { type: params.replaceUrl.endsWith(".mp4") ? "video/mp4" : "image/png" });
              form.append("replaceFile", rBlob, "replacement");
              form.append("replaceMode", params.replaceMode ?? "fill");
              form.append("replaceStartTime", String(params.replaceStartTime ?? 0));
              form.append("replaceEndTime", String(params.replaceEndTime ?? 0));
            }
          }
          // Note: background=false for sync execution
          const secret = process.env.CRON_SECRET;
          const ppRes = await fetch(`${baseUrl}/api/toolbox/post-production`, {
            method: "POST",
            headers: secret ? { Authorization: `Bearer ${secret}` } : {},
            body: form,
          });
          const ppData = await ppRes.json();
          if (!ppRes.ok) throw new Error(ppData.error || "Post-production failed");
          await prisma.mediaTask.update({ where: { id: task.id }, data: { status: "completed", outputUrl: ppData.url, completedAt: new Date() } });
          await saveToGallery({ userId: task.userId, type: "video", modelId: "post-production", modelLabel: "Post Production", prompt: task.prompt, sourceUrl: ppData.url, isPublic: false });
          completed++;
        } catch (err) {
          await prisma.mediaTask.update({ where: { id: task.id }, data: { status: "failed", error: err instanceof Error ? err.message : "Post-production failed" } });
          failed++;
        }
        continue;
      }

      // Standard video generation polling
      if (!task.providerTaskId) {
        continue;
      }

      const provider = task.provider as VideoProvider;
      const pollKey = provider === "wavespeed"
        ? (task.providerPollUrl ?? task.providerTaskId)
        : task.providerTaskId;

      const result = await pollVideo(pollKey, provider);

      if (result.status === "completed" && result.outputs.length > 0) {
        const sourceUrl = result.outputs[0];

        // Download and persist to R2
        let persistedUrl = sourceUrl;
        try {
          const resp = await fetch(sourceUrl);
          if (resp.ok) {
            const buffer = Buffer.from(await resp.arrayBuffer());
            const ext = task.type === "video" ? "mp4" : "jpg";
            const uploaded = await put(
              `tasks/${task.userId}/${task.id}.${ext}`,
              buffer,
              { contentType: task.type === "video" ? "video/mp4" : "image/jpeg", addRandomSuffix: false },
            );
            persistedUrl = uploaded.url;
          }
        } catch (e) {
          console.error(`[TaskProcessor] R2 upload failed for task ${task.id}, using source URL:`, e);
        }

        // Update task
        await prisma.mediaTask.update({
          where: { id: task.id },
          data: {
            status: "completed",
            outputUrl: persistedUrl,
            completedAt: new Date(),
            pollAttempts: { increment: 1 },
          },
        });

        // Auto-save to gallery
        try {
          await saveToGallery({
            userId: task.userId,
            type: task.type as "image" | "video",
            modelId: task.modelId,
            modelLabel: task.modelLabel,
            prompt: task.prompt,
            sourceUrl: persistedUrl,
            inputImageUrl: task.inputImageUrl ?? undefined,
            aspectRatio: task.aspectRatio,
            isPublic: false,
            generationMeta: {
              provider: task.provider,
              kind: task.type,
              mode: task.mode,
              duration: task.duration,
              generateAudio: task.generateAudio,
              taskId: task.providerTaskId,
              backgroundTask: true,
            },
          });
        } catch (e) {
          console.error(`[TaskProcessor] Gallery save failed for task ${task.id}:`, e);
        }

        completed++;
        console.log(`[TaskProcessor] Task ${task.id} completed → ${persistedUrl}`);
      } else if (result.status === "failed") {
        await prisma.mediaTask.update({
          where: { id: task.id },
          data: {
            status: "failed",
            error: result.error ?? "Generation failed",
            pollAttempts: { increment: 1 },
          },
        });
        failed++;
        console.log(`[TaskProcessor] Task ${task.id} failed: ${result.error}`);
      } else {
        // Still processing
        await prisma.mediaTask.update({
          where: { id: task.id },
          data: { pollAttempts: { increment: 1 } },
        });
        stillProcessing++;
      }
    } catch (err) {
      console.error(`[TaskProcessor] Error processing task ${task.id}:`, err);
      await prisma.mediaTask.update({
        where: { id: task.id },
        data: { pollAttempts: { increment: 1 } },
      }).catch(() => {});
    }
  }

  // Mark tasks that exceeded max poll attempts as failed
  await prisma.mediaTask.updateMany({
    where: {
      status: { in: ["pending", "processing"] },
      pollAttempts: { gte: MAX_POLL_ATTEMPTS },
    },
    data: {
      status: "failed",
      error: "Task timed out after maximum polling attempts",
    },
  });

  return NextResponse.json({
    processed: tasks.length,
    completed,
    failed,
    stillProcessing,
  });
}
