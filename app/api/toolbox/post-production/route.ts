import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { put } from "@/lib/r2";
import { prisma } from "@/lib/db";
import ffmpeg from "fluent-ffmpeg";
import explicitFfmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

let ffmpegPath = explicitFfmpegPath;
if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
  const localPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
  if (fs.existsSync(localPath)) ffmpegPath = localPath;
}
if (ffmpegPath && fs.existsSync(ffmpegPath)) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export const maxDuration = 120;

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  bgColor: string;
}

interface MaskRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

function toFfmpegColor(hex: string): string {
  if (hex.startsWith("rgba")) {
    const m = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) {
      const r = Number(m[1]).toString(16).padStart(2, "0");
      const g = Number(m[2]).toString(16).padStart(2, "0");
      const b = Number(m[3]).toString(16).padStart(2, "0");
      const a = Math.round(Number(m[4] ?? 1) * 255).toString(16).padStart(2, "0");
      return `0x${r}${g}${b}${a}`;
    }
  }
  return hex.replace("#", "0x");
}

async function downloadToFile(url: string, filePath: string) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download: ${resp.status}`);
  fs.writeFileSync(filePath, Buffer.from(await resp.arrayBuffer()));
}

interface ProbeInfo { fps: number; duration: number; width: number; height: number }

interface MaskBBox { x: number; y: number; w: number; h: number }

/**
 * Analyze a binary mask video to find the bounding box of white pixels.
 * Extracts a frame near the middle, scans for white region.
 */
function detectMaskBBox(maskPath: string, videoW: number, videoH: number): Promise<MaskBBox> {
  return new Promise((resolve, reject) => {
    const framePath = path.join(os.tmpdir(), `bbox-${randomUUID()}.raw`);
    // Extract a frame near 1s mark as raw grayscale
    ffmpeg(maskPath)
      .seekInput(1)
      .outputOptions(["-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray"])
      .output(framePath)
      .on("end", () => {
        try {
          const buf = fs.readFileSync(framePath);
          // Scan pixels to find bounding box of non-black (>128) pixels
          let minX = videoW, minY = videoH, maxX = 0, maxY = 0;
          let found = false;
          for (let y = 0; y < videoH; y++) {
            for (let x = 0; x < videoW; x++) {
              const idx = y * videoW + x;
              if (idx < buf.length && buf[idx] > 128) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
              }
            }
          }
          fs.unlinkSync(framePath);
          if (!found) {
            // No white pixels found — fallback to center region
            resolve({ x: videoW * 0.25, y: videoH * 0.25, w: videoW * 0.5, h: videoH * 0.5 });
          } else {
            // Add small padding
            const pad = 4;
            resolve({
              x: Math.max(0, minX - pad),
              y: Math.max(0, minY - pad),
              w: Math.min(videoW - minX, maxX - minX + pad * 2),
              h: Math.min(videoH - minY, maxY - minY + pad * 2),
            });
          }
        } catch (e) {
          try { fs.unlinkSync(framePath); } catch {}
          // Fallback
          resolve({ x: 0, y: 0, w: videoW, h: videoH });
        }
      })
      .on("error", () => {
        // Fallback to full frame
        resolve({ x: 0, y: 0, w: videoW, h: videoH });
      })
      .run();
  });
}

function probeVideo(filePath: string): Promise<ProbeInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const vs = metadata.streams.find((s) => s.codec_type === "video");
      const rateStr = vs?.r_frame_rate ?? "24/1";
      const [num, den] = rateStr.split("/").map(Number);
      resolve({
        fps: den ? num / den : 24,
        duration: Number(metadata.format.duration) || 5,
        width: vs?.width || 1280,
        height: vs?.height || 720,
      });
    });
  });
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const videoUrl = form.get("videoUrl") as string | null;
  const textOverlaysRaw = form.get("textOverlays") as string;
  const masksRaw = form.get("masks") as string;
  const videoDimsRaw = form.get("videoDims") as string;
  const sam3MaskUrl = form.get("sam3MaskUrl") as string | null;
  const replaceFile = form.get("replaceFile") as File | null;
  const replaceMode = (form.get("replaceMode") as string) ?? "fill";
  const replaceStartTime = Number(form.get("replaceStartTime") ?? 0);
  const replaceEndTime = Number(form.get("replaceEndTime") ?? 0);
  const isBackground = form.get("background") === "true";

  if (!file && !videoUrl) {
    return NextResponse.json({ error: "No video provided" }, { status: 400 });
  }

  // Background mode: upload source video to R2, save task to DB, return immediately
  if (isBackground) {
    try {
      let sourceVideoUrl = videoUrl;
      if (file && !videoUrl) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploaded = await put(`post-production/${user.id}/src-${Date.now()}.mp4`, buffer, {
          contentType: "video/mp4", addRandomSuffix: false,
        });
        sourceVideoUrl = uploaded.url;
      }

      // Upload replacement file to R2 if provided
      let replaceUrl: string | null = null;
      if (replaceFile) {
        const rBuf = Buffer.from(await replaceFile.arrayBuffer());
        const ext = replaceFile.type.startsWith("video/") ? "mp4" : "png";
        const rUp = await put(`post-production/${user.id}/replace-${Date.now()}.${ext}`, rBuf, {
          contentType: replaceFile.type, addRandomSuffix: false,
        });
        replaceUrl = rUp.url;
      }

      const task = await prisma.mediaTask.create({
        data: {
          userId: user.id,
          type: "video",
          modelId: "post-production",
          modelLabel: sam3MaskUrl ? "Post Production (SAM + Replace)" : "Post Production",
          prompt: `Post-production: ${textOverlaysRaw?.length > 2 ? "text overlays" : ""}${masksRaw?.length > 2 ? " masks" : ""}${sam3MaskUrl ? " SAM tracking" : ""}${replaceFile ? " replacement" : ""}`.trim(),
          mode: "post-production",
          status: "pending",
          provider: "local",
          providerTaskId: null,
          providerPollUrl: JSON.stringify({
            sourceVideoUrl,
            textOverlays: textOverlaysRaw,
            masks: masksRaw,
            videoDims: videoDimsRaw,
            sam3MaskUrl,
            replaceUrl,
            replaceMode,
            replaceStartTime,
            replaceEndTime,
          }),
        },
      });

      return NextResponse.json({ taskId: task.id });
    } catch (err) {
      console.error("[PostProduction] Background task creation failed:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to create task" },
        { status: 500 },
      );
    }
  }

  let textOverlays: TextOverlay[] = [];
  let masks: MaskRect[] = [];
  let videoDims = { w: 1280, h: 720 };

  try {
    textOverlays = JSON.parse(textOverlaysRaw || "[]");
    masks = JSON.parse(masksRaw || "[]");
    videoDims = JSON.parse(videoDimsRaw || '{"w":1280,"h":720}');
  } catch {
    return NextResponse.json({ error: "Invalid overlay data" }, { status: 400 });
  }

  const hasOverlays = textOverlays.length > 0 || masks.length > 0;
  const hasReplacement = sam3MaskUrl && replaceFile;

  if (!hasOverlays && !hasReplacement) {
    return NextResponse.json({ error: "No operations to apply" }, { status: 400 });
  }

  const tempDir = os.tmpdir();
  const uid = randomUUID();
  const inputPath = path.join(tempDir, `pp-in-${uid}.mp4`);
  const outputPath = path.join(tempDir, `pp-out-${uid}.mp4`);
  const maskPath = path.join(tempDir, `pp-mask-${uid}.mp4`);
  const replacePath = path.join(tempDir, `pp-replace-${uid}`);
  const tempFiles = [inputPath, outputPath, maskPath, replacePath];

  try {
    // Save input video
    if (file) {
      fs.writeFileSync(inputPath, Buffer.from(await file.arrayBuffer()));
    } else if (videoUrl) {
      const resp = await fetch(videoUrl);
      if (!resp.ok) throw new Error("Failed to download video");
      fs.writeFileSync(inputPath, Buffer.from(await resp.arrayBuffer()));
    }

    // Download SAM mask video if doing replacement
    if (sam3MaskUrl) {
      await downloadToFile(sam3MaskUrl, maskPath);
    }

    // Save replacement file
    let replaceExt = "png";
    if (replaceFile) {
      replaceExt = replaceFile.type.startsWith("video/") ? "mp4" : "png";
      const rPath = `${replacePath}.${replaceExt}`;
      fs.writeFileSync(rPath, Buffer.from(await replaceFile.arrayBuffer()));
      tempFiles.push(rPath);
    }

    if (hasReplacement) {
      // ── SAM Mask Compositing ──
      // Probe original video to get FPS for frame sync
      const probe = await probeVideo(inputPath);
      const W = probe.width;
      const H = probe.height;
      const fps = Math.round(probe.fps);

      const startT = replaceStartTime || 0;
      const endT = replaceEndTime || probe.duration;

      // Detect where the mask's white region is so we can position replacement correctly
      const bbox = await detectMaskBBox(maskPath, W, H);
      console.log(`[PostProduction] Mask bbox: x=${bbox.x} y=${bbox.y} w=${bbox.w} h=${bbox.h}`);
      console.log(`[PostProduction] Mask compositing: ${W}x${H}@${fps}fps, replace=${replaceExt}, mode=${replaceMode}, time=${startT.toFixed(2)}-${endT.toFixed(2)}s`);

      const replaceInputPath = `${replacePath}.${replaceExt}`;
      const isVideoReplace = replaceExt === "mp4";

      // Scale mode for replacement content
      const scaleFilter = replaceMode === "fit"
        ? `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`
        : `scale=${W}:${H}`;

      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg();

        // Input 0: original video
        cmd.input(inputPath);

        // Input 1: replacement content
        if (isVideoReplace) {
          cmd.input(replaceInputPath);
        } else {
          // Static image: loop it to match video duration, set FPS
          cmd.input(replaceInputPath)
            .inputOptions(["-loop", "1", "-framerate", String(fps)]);
        }

        // Input 2: SAM mask video
        cmd.input(maskPath);

        // Filter graph:
        // 1. Sync all inputs to same FPS and size
        // 2. Use maskedmerge: where mask=white → show replacement, mask=black → show original
        // Strategy:
        // 1. Scale replacement to fit the mask's bounding box (not full video)
        // 2. Pad replacement to full video size at the correct position
        // 3. Use mask as alpha via alphamerge
        // 4. Overlay onto original, enabled only during time range
        const bx = Math.round(bbox.x);
        const by = Math.round(bbox.y);
        const bw = Math.max(2, Math.round(bbox.w));
        const bh = Math.max(2, Math.round(bbox.h));
        const timeEnable = `between(t,${startT.toFixed(3)},${endT.toFixed(3)})`;

        const replScale = replaceMode === "fit"
          ? `scale=${bw}:${bh}:force_original_aspect_ratio=decrease,pad=${bw}:${bh}:(ow-iw)/2:(oh-ih)/2`
          : `scale=${bw}:${bh}`;

        const filters: string[] = [
          // Sync original fps
          `[0:v]fps=${fps}[orig]`,
          // Scale replacement to bbox size, then pad to full video size at bbox position
          `[1:v]${replScale},fps=${fps},pad=${W}:${H}:${bx}:${by}:color=black@0,format=yuva420p[repl]`,
          // Scale mask to full video, grayscale for alpha
          `[2:v]scale=${W}:${H},fps=${fps},format=gray[mask]`,
          // Merge mask as alpha into positioned replacement
          `[repl][mask]alphamerge[replalpha]`,
          // Overlay onto original, only during time range
          `[orig][replalpha]overlay=0:0:enable='${timeEnable}'[vout]`,
        ];

        // Apply additional text overlays and static masks on top
        let lastLabel = "[vout]";
        let filterIdx = 0;

        for (const mask of masks) {
          const x = Math.round((mask.x / 100) * W);
          const y = Math.round((mask.y / 100) * H);
          const w = Math.round((mask.w / 100) * W);
          const h = Math.round((mask.h / 100) * H);
          const outLabel = `[sm${filterIdx}]`;
          if (mask.fill === "blur") {
            filters.push(`${lastLabel}split[sbase${filterIdx}][ssrc${filterIdx}]`);
            filters.push(`[ssrc${filterIdx}]crop=${w}:${h}:${x}:${y},boxblur=15:5[sblur${filterIdx}]`);
            filters.push(`[sbase${filterIdx}][sblur${filterIdx}]overlay=${x}:${y}${outLabel}`);
          } else {
            const color = toFfmpegColor(mask.fill);
            filters.push(`${lastLabel}drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=fill${outLabel}`);
          }
          lastLabel = outLabel;
          filterIdx++;
        }

        for (const t of textOverlays) {
          const x = Math.round((t.x / 100) * W);
          const y = Math.round((t.y / 100) * H);
          const escapedText = t.text.replace(/'/g, "'\\''").replace(/:/g, "\\:");
          const outLabel = `[st${filterIdx}]`;
          let drawtext = `drawtext=text='${escapedText}'`;
          drawtext += `:x=${x}-(tw/2):y=${y}-(th/2)`;
          drawtext += `:fontsize=${t.fontSize}:fontcolor=${toFfmpegColor(t.color)}`;
          if (t.fontFamily.includes("Noto")) {
            drawtext += `:fontfile=/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc`;
          }
          if (t.bgColor) {
            drawtext += `:box=1:boxcolor=${toFfmpegColor(t.bgColor)}:boxborderw=6`;
          }
          filters.push(`${lastLabel}${drawtext}${outLabel}`);
          lastLabel = outLabel;
          filterIdx++;
        }

        // Rename last label to [final]
        const lastFilter = filters[filters.length - 1];
        filters[filters.length - 1] = lastFilter.replace(lastLabel, "[final]");

        const filterStr = filters.join(";");
        console.log(`[PostProduction] Filter graph:\n${filterStr}`);

        cmd.outputOptions([
          "-filter_complex", filterStr,
          "-map", "[final]",
          "-map", "0:a?",
          "-c:v", "libx264", "-crf", "18", "-preset", "fast",
          "-c:a", "copy",
          "-movflags", "+faststart",
          "-shortest",
        ]);

        cmd.output(outputPath)
          .on("end", () => { console.log("[PostProduction] Composite done"); resolve(); })
          .on("error", (err) => { console.error("[PostProduction] ffmpeg error:", err.message); reject(err); })
          .run();
      });
    } else {
      // ── Text/Mask Only Mode (no SAM replacement) ──
      console.log(`[PostProduction] Overlay mode: ${masks.length} masks, ${textOverlays.length} text`);

      const filters: string[] = [];
      let lastLabel = "0:v";
      let filterIdx = 0;

      for (const mask of masks) {
        const x = Math.round((mask.x / 100) * videoDims.w);
        const y = Math.round((mask.y / 100) * videoDims.h);
        const w = Math.round((mask.w / 100) * videoDims.w);
        const h = Math.round((mask.h / 100) * videoDims.h);

        if (mask.fill === "blur") {
          const outLabel = `m${filterIdx}`;
          filters.push(`[${lastLabel}]split[base${filterIdx}][src${filterIdx}]`);
          filters.push(`[src${filterIdx}]crop=${w}:${h}:${x}:${y},boxblur=15:5[blur${filterIdx}]`);
          filters.push(`[base${filterIdx}][blur${filterIdx}]overlay=${x}:${y}[${outLabel}]`);
          lastLabel = outLabel;
        } else {
          const color = toFfmpegColor(mask.fill);
          const outLabel = `m${filterIdx}`;
          filters.push(`[${lastLabel}]drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=fill[${outLabel}]`);
          lastLabel = outLabel;
        }
        filterIdx++;
      }

      for (const t of textOverlays) {
        const x = Math.round((t.x / 100) * videoDims.w);
        const y = Math.round((t.y / 100) * videoDims.h);
        const escapedText = t.text.replace(/'/g, "'\\''").replace(/:/g, "\\:");
        const outLabel = `t${filterIdx}`;
        let drawtext = `drawtext=text='${escapedText}'`;
        drawtext += `:x=${x}-(tw/2):y=${y}-(th/2)`;
        drawtext += `:fontsize=${t.fontSize}:fontcolor=${toFfmpegColor(t.color)}`;
        if (t.fontFamily.includes("Noto")) {
          drawtext += `:fontfile=/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc`;
        }
        if (t.bgColor) {
          drawtext += `:box=1:boxcolor=${toFfmpegColor(t.bgColor)}:boxborderw=6`;
        }
        filters.push(`[${lastLabel}]${drawtext}[${outLabel}]`);
        lastLabel = outLabel;
        filterIdx++;
      }

      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg(inputPath);
        if (filters.length > 0) {
          const lastFilter = filters[filters.length - 1];
          filters[filters.length - 1] = lastFilter.replace(`[${lastLabel}]`, "[vout]");
          cmd.outputOptions([
            "-filter_complex", filters.join(";"),
            "-map", "[vout]",
            "-map", "0:a?",
            "-c:v", "libx264", "-crf", "18", "-preset", "fast",
            "-c:a", "copy",
            "-movflags", "+faststart",
          ]);
        }
        cmd.output(outputPath)
          .on("end", () => { console.log("[PostProduction] Done"); resolve(); })
          .on("error", (err) => { console.error("[PostProduction] Error:", err); reject(err); })
          .run();
      });
    }

    // Upload to R2
    const fileContent = fs.readFileSync(outputPath);
    const uploaded = await put(`post-production/${user.id}/${Date.now()}.mp4`, fileContent, {
      contentType: "video/mp4",
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: uploaded.url });
  } catch (err) {
    console.error("[PostProduction] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 },
    );
  } finally {
    for (const f of tempFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    }
  }
}
