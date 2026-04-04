"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocale } from "next-intl";
import DashboardShell from "@/components/DashboardShell";

interface TextOverlay {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  bgColor: string; // "" = transparent
}

interface MaskRect {
  id: string;
  x: number; // percentage 0-100
  y: number;
  w: number;
  h: number;
  fill: string; // "blur" | hex color
}

type Tool = "select" | "text" | "mask" | "smartTrack" | "aiEdit";

export default function PostProductionPage() {
  const locale = useLocale();
  const prefix = locale === "zh" ? "/zh" : "";
  const isZh = locale === "zh";

  // Video state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [masks, setMasks] = useState<MaskRect[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Drawing state for mask
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // SAM smart tracking state
  const [samClickPoints, setSamClickPoints] = useState<{ x: number; y: number; frame: number }[]>([]);
  const [samLoading, setSamLoading] = useState(false);
  const [samMaskUrl, setSamMaskUrl] = useState<string | null>(null);

  // AI Edit state
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [aiEditLoading, setAiEditLoading] = useState(false);
  const [aiEditResult, setAiEditResult] = useState<string | null>(null);
  const [aiEditRefImage, setAiEditRefImage] = useState<string | null>(null);

  // Replacement content state
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacePreviewUrl, setReplacePreviewUrl] = useState<string | null>(null);
  const [replaceMode, setReplaceMode] = useState<"fill" | "fit">("fill");
  const [replaceStartTime, setReplaceStartTime] = useState<number>(0);
  const [replaceEndTime, setReplaceEndTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Video dimensions
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });

  // Public URL for SAM3 (needs to be accessible by Replicate)
  const [publicVideoUrl, setPublicVideoUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setTextOverlays([]);
    setMasks([]);
    setResultUrl(null);
    setError("");
    setSamMaskUrl(null);
    setSamClickPoints([]);
    setPublicVideoUrl(null);

    // Upload to R2 for public URL (needed by SAM3)
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/toolbox/upload-video", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setPublicVideoUrl(data.url);
      }
    } catch {
      // Non-critical — SAM3 just won't work without public URL
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDims({ w: videoRef.current.videoWidth, h: videoRef.current.videoHeight });
      const dur = videoRef.current.duration || 0;
      setVideoDuration(dur);
      setReplaceEndTime(dur);
    }
  };

  // Get mouse position as percentage of container
  const getRelPos = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  // Get pixel coords on the actual video frame (accounts for letterboxing)
  const getVideoPixelCoords = useCallback((e: React.MouseEvent) => {
    const vid = videoRef.current;
    if (!vid) return { x: 0, y: 0 };
    const rect = vid.getBoundingClientRect();

    // The video element might letterbox — get actual rendered video area
    const displayW = rect.width;
    const displayH = rect.height;
    const videoW = vid.videoWidth || videoDims.w;
    const videoH = vid.videoHeight || videoDims.h;

    // Calculate the actual video rendering area within the element
    const displayAspect = displayW / displayH;
    const videoAspect = videoW / videoH;

    let renderX = 0, renderY = 0, renderW = displayW, renderH = displayH;
    if (videoAspect > displayAspect) {
      // Video is wider — letterbox top/bottom
      renderH = displayW / videoAspect;
      renderY = (displayH - renderH) / 2;
    } else {
      // Video is taller — letterbox left/right
      renderW = displayH * videoAspect;
      renderX = (displayW - renderW) / 2;
    }

    // Mouse position relative to video element
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to pixel coords on the actual video frame
    const px = Math.round(((mouseX - renderX) / renderW) * videoW);
    const py = Math.round(((mouseY - renderY) / renderH) * videoH);

    return {
      x: Math.max(0, Math.min(videoW, px)),
      y: Math.max(0, Math.min(videoH, py)),
    };
  }, [videoDims]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (activeTool === "smartTrack") {
      // Pause video at current frame for accurate clicking
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      const pixelPoint = getVideoPixelCoords(e);
      const currentTime = videoRef.current?.currentTime ?? 0;
      const fps = 24;
      const currentFrame = Math.round(currentTime * fps);
      console.log(`[SmartTrack] Click at pixel (${pixelPoint.x}, ${pixelPoint.y}) on frame ${currentFrame} (t=${currentTime.toFixed(2)}s)`);
      setSamClickPoints((prev) => [...prev, { ...pixelPoint, frame: currentFrame }]);
      // Auto-set replacement start time to first click's time
      if (samClickPoints.length === 0) {
        setReplaceStartTime(currentTime);
      }
      return;
    }
    if (activeTool === "mask") {
      const pos = getRelPos(e);
      setIsDrawing(true);
      setDrawStart(pos);
    } else if (activeTool === "text") {
      const pos = getRelPos(e);
      const id = `txt-${Date.now()}`;
      setTextOverlays((prev) => [
        ...prev,
        {
          id,
          text: isZh ? "输入文字" : "Enter text",
          x: pos.x,
          y: pos.y,
          fontSize: 32,
          color: "#ffffff",
          fontFamily: "Noto Sans SC",
          bgColor: "",
        },
      ]);
      setSelectedId(id);
      setActiveTool("select");
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return;
    const pos = getRelPos(e);
    // Live preview via temp canvas overlay handled by CSS
    const tempMask = {
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      w: Math.abs(pos.x - drawStart.x),
      h: Math.abs(pos.y - drawStart.y),
    };
    // Update the drawing preview
    const canvas = canvasRef.current;
    if (canvas && containerRef.current) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = containerRef.current.offsetWidth;
        canvas.height = containerRef.current.offsetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(
          (tempMask.x / 100) * canvas.width,
          (tempMask.y / 100) * canvas.height,
          (tempMask.w / 100) * canvas.width,
          (tempMask.h / 100) * canvas.height,
        );
      }
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return;
    const pos = getRelPos(e);
    const w = Math.abs(pos.x - drawStart.x);
    const h = Math.abs(pos.y - drawStart.y);
    if (w > 1 && h > 1) {
      const id = `mask-${Date.now()}`;
      setMasks((prev) => [
        ...prev,
        {
          id,
          x: Math.min(drawStart.x, pos.x),
          y: Math.min(drawStart.y, pos.y),
          w,
          h,
          fill: "blur",
        },
      ]);
      setSelectedId(id);
    }
    setIsDrawing(false);
    setDrawStart(null);
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const updateMask = (id: string, updates: Partial<MaskRect>) => {
    setMasks((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setTextOverlays((prev) => prev.filter((t) => t.id !== selectedId));
    setMasks((prev) => prev.filter((m) => m.id !== selectedId));
    setSelectedId(null);
  };

  const handleSamTrack = async () => {
    if (!publicVideoUrl || samClickPoints.length === 0) return;
    setSamLoading(true);
    setError("");
    setSamMaskUrl(null);
    try {
      const res = await fetch("/api/toolbox/sam3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: publicVideoUrl,
          clickPoints: samClickPoints.map((p) => ({ x: p.x, y: p.y })),
          clickFrames: samClickPoints.map((p) => p.frame),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tracking failed");
      setSamMaskUrl(data.maskVideoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "SAM tracking failed");
    } finally {
      setSamLoading(false);
    }
  };

  const handleAiEdit = async () => {
    if (!publicVideoUrl || !aiEditPrompt.trim()) return;
    setAiEditLoading(true);
    setError("");
    setAiEditResult(null);
    try {
      const res = await fetch("/api/toolbox/video-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: publicVideoUrl,
          prompt: aiEditPrompt.trim(),
          referenceImageUrl: aiEditRefImage ?? undefined,
          background: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI edit failed");
      if (data.taskId) {
        setExportSubmitted(true);
      } else {
        setAiEditResult(data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI edit failed");
    } finally {
      setAiEditLoading(false);
    }
  };

  const selectedText = textOverlays.find((t) => t.id === selectedId);
  const selectedMask = masks.find((m) => m.id === selectedId);

  const [exportSubmitted, setExportSubmitted] = useState(false);

  const handleProcess = async () => {
    if (!videoFile && !videoUrl) return;
    setProcessing(true);
    setError("");
    setResultUrl(null);
    setExportSubmitted(false);

    try {
      const form = new FormData();
      if (videoFile) {
        form.append("file", videoFile);
      } else if (videoUrl) {
        form.append("videoUrl", videoUrl);
      }
      form.append("textOverlays", JSON.stringify(textOverlays));
      form.append("masks", JSON.stringify(masks));
      form.append("videoDims", JSON.stringify(videoDims));
      if (samMaskUrl) form.append("sam3MaskUrl", samMaskUrl);
      if (replaceFile) {
        form.append("replaceFile", replaceFile);
        form.append("replaceMode", replaceMode);
        form.append("replaceStartTime", String(replaceStartTime));
        form.append("replaceEndTime", String(replaceEndTime));
      }

      form.append("background", "true");
      const res = await fetch("/api/toolbox/post-production", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Processing failed");
      if (data.taskId) {
        // Background mode — task queued
        setExportSubmitted(true);
        setProcessing(false);
      } else {
        setResultUrl(data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const tools: { key: Tool; label: string; labelZh: string; icon: string }[] = [
    { key: "select", label: "Select", labelZh: "选择", icon: "👆" },
    { key: "text", label: "Add Text", labelZh: "添加文字", icon: "T" },
    { key: "mask", label: "Mask Area", labelZh: "遮罩区域", icon: "⬛" },
    { key: "smartTrack", label: "Smart Track", labelZh: "智能跟踪", icon: "🧠" },
    { key: "aiEdit", label: "AI Edit", labelZh: "AI 编辑", icon: "✨" },
  ];

  const fontOptions = [
    { value: "Noto Sans SC", label: "思源黑体 / Noto Sans SC" },
    { value: "Noto Serif SC", label: "思源宋体 / Noto Serif SC" },
    { value: "Arial", label: "Arial" },
    { value: "Helvetica", label: "Helvetica" },
  ];

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {isZh ? "后期制作" : "Post Production"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isZh ? "添加文字叠加、遮罩区域，修复 AI 生成的文字问题" : "Add text overlays, mask areas, fix AI-generated text issues"}
            </p>
          </div>
          <a
            href={`${prefix}/media-studio`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isZh ? "← 返回" : "← Back"}
          </a>
        </div>

        {!videoUrl ? (
          /* Upload area */
          <label className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-blue-400 transition-colors">
            <span className="text-4xl mb-3">🎬</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {isZh ? "点击上传视频" : "Click to upload video"}
            </span>
            <span className="text-gray-400 text-xs mt-1">MP4, WebM, MOV</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          </label>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            {/* Main preview area */}
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                {tools.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTool(t.key)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      activeTool === t.key
                        ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <span className="mr-1">{t.icon}</span>
                    {isZh ? t.labelZh : t.label}
                  </button>
                ))}
                <div className="flex-1" />
                {selectedId && (
                  <button
                    onClick={deleteSelected}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    {isZh ? "删除" : "Delete"}
                  </button>
                )}
                <button
                  onClick={() => { setVideoUrl(null); setVideoFile(null); setTextOverlays([]); setMasks([]); setResultUrl(null); }}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {isZh ? "换视频" : "Change"}
                </button>
              </div>

              {/* Video preview with overlays — constrained to viewport */}
              <div
                ref={containerRef}
                className="relative bg-black rounded-lg select-none"
                style={{ cursor: activeTool === "text" ? "crosshair" : activeTool === "mask" ? "crosshair" : activeTool === "smartTrack" ? "crosshair" : "default" }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full"
                  style={{ maxHeight: "70vh" }}
                  controls={activeTool === "select" || activeTool === "smartTrack"}
                  onLoadedMetadata={handleVideoLoaded}
                  muted
                />

                {/* Drawing canvas for mask preview */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Render masks */}
                {masks.map((m) => (
                  <div
                    key={m.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(m.id); setActiveTool("select"); }}
                    className={`absolute border-2 ${selectedId === m.id ? "border-red-500" : "border-red-400/50"}`}
                    style={{
                      left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%`, height: `${m.h}%`,
                      background: m.fill === "blur" ? "rgba(0,0,0,0.6)" : m.fill,
                      backdropFilter: m.fill === "blur" ? "blur(12px)" : undefined,
                      cursor: "pointer",
                    }}
                  />
                ))}

                {/* Render text overlays */}
                {textOverlays.map((t) => (
                  <div
                    key={t.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(t.id); setActiveTool("select"); }}
                    className={`absolute cursor-pointer ${selectedId === t.id ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                    style={{
                      left: `${t.x}%`, top: `${t.y}%`,
                      transform: "translate(-50%, -50%)",
                      fontSize: `${t.fontSize}px`,
                      color: t.color,
                      fontFamily: t.fontFamily,
                      backgroundColor: t.bgColor || undefined,
                      padding: t.bgColor ? "2px 8px" : undefined,
                      borderRadius: t.bgColor ? "4px" : undefined,
                      whiteSpace: "nowrap",
                      textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                    }}
                  >
                    {t.text}
                  </div>
                ))}

                {/* Render SAM click points */}
                {activeTool === "smartTrack" && videoDims.w > 0 && samClickPoints.map((p, i) => (
                  <div
                    key={`sam-${i}`}
                    className="absolute w-5 h-5 rounded-full bg-purple-500 border-2 border-white shadow-lg pointer-events-none"
                    style={{
                      left: `${(p.x / videoDims.w) * 100}%`,
                      top: `${(p.y / videoDims.h) * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white bg-purple-600 px-1 rounded whitespace-nowrap">
                      {i + 1} ({p.x},{p.y})
                    </span>
                  </div>
                ))}
              </div>

              {/* Process button + status */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleProcess}
                    disabled={processing || (textOverlays.length === 0 && masks.length === 0 && !(samMaskUrl && replaceFile))}
                    className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing
                      ? (isZh ? "处理中..." : "Processing...")
                      : (isZh ? "导出视频" : "Export Video")}
                  </button>
                  {error && <span className="text-sm text-red-500">{error}</span>}
                </div>

                {exportSubmitted && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-400 flex-1">
                      {isZh ? "任务已提交后台处理，完成后自动保存到素材管理" : "Task submitted — will auto-save to Materials when complete"}
                    </p>
                    <a
                      href={`${prefix}/media-studio/assets`}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shrink-0"
                    >
                      {isZh ? "查看进度" : "View Progress"}
                    </a>
                  </div>
                )}
              </div>

              {/* Result */}
              {!exportSubmitted && resultUrl && (
                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    {isZh ? "导出完成" : "Export complete"}
                  </p>
                  <video src={resultUrl} controls className="w-full rounded-lg" style={{ maxHeight: "70vh" }} />
                  <div className="flex gap-2">
                    <a
                      href={resultUrl}
                      download
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {isZh ? "下载" : "Download"}
                    </a>
                    <a
                      href={resultUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {isZh ? "新窗口打开" : "Open"}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Properties panel */}
            <div className="space-y-4">
              {/* Selected text properties */}
              {selectedText && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {isZh ? "文字属性" : "Text Properties"}
                  </h3>
                  <div>
                    <label className="text-xs text-gray-500">{isZh ? "文字内容" : "Text"}</label>
                    <textarea
                      value={selectedText.text}
                      onChange={(e) => updateTextOverlay(selectedText.id, { text: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">{isZh ? "字号" : "Size"}</label>
                      <input
                        type="number"
                        value={selectedText.fontSize}
                        onChange={(e) => updateTextOverlay(selectedText.id, { fontSize: Number(e.target.value) })}
                        className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        min={12}
                        max={120}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">{isZh ? "颜色" : "Color"}</label>
                      <input
                        type="color"
                        value={selectedText.color}
                        onChange={(e) => updateTextOverlay(selectedText.id, { color: e.target.value })}
                        className="w-full mt-1 h-[34px] rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{isZh ? "字体" : "Font"}</label>
                    <select
                      value={selectedText.fontFamily}
                      onChange={(e) => updateTextOverlay(selectedText.id, { fontFamily: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      {fontOptions.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{isZh ? "背景色" : "Background"}</label>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => updateTextOverlay(selectedText.id, { bgColor: "" })}
                        className={`px-2 py-1 text-xs rounded ${!selectedText.bgColor ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {isZh ? "透明" : "None"}
                      </button>
                      <button
                        onClick={() => updateTextOverlay(selectedText.id, { bgColor: "rgba(0,0,0,0.7)" })}
                        className={`px-2 py-1 text-xs rounded ${selectedText.bgColor?.includes("0,0,0") ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {isZh ? "黑底" : "Dark"}
                      </button>
                      <button
                        onClick={() => updateTextOverlay(selectedText.id, { bgColor: "rgba(255,255,255,0.8)" })}
                        className={`px-2 py-1 text-xs rounded ${selectedText.bgColor?.includes("255,255,255") ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {isZh ? "白底" : "Light"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected mask properties */}
              {selectedMask && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {isZh ? "遮罩属性" : "Mask Properties"}
                  </h3>
                  <div>
                    <label className="text-xs text-gray-500">{isZh ? "填充方式" : "Fill"}</label>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => updateMask(selectedMask.id, { fill: "blur" })}
                        className={`px-3 py-1.5 text-xs rounded-md ${selectedMask.fill === "blur" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {isZh ? "模糊" : "Blur"}
                      </button>
                      <button
                        onClick={() => updateMask(selectedMask.id, { fill: "#000000" })}
                        className={`px-3 py-1.5 text-xs rounded-md ${selectedMask.fill === "#000000" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {isZh ? "黑色" : "Black"}
                      </button>
                      <button
                        onClick={() => updateMask(selectedMask.id, { fill: "#ffffff" })}
                        className={`px-3 py-1.5 text-xs rounded-md ${selectedMask.fill === "#ffffff" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {isZh ? "白色" : "White"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SAM Smart Tracking Panel */}
              {activeTool === "smartTrack" && (
                <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4 space-y-3">
                  <h3 className="text-sm font-medium text-purple-900 dark:text-purple-300">
                    🧠 {isZh ? "智能跟踪" : "Smart Tracking"}
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {isZh
                      ? "1. 先暂停视频到目标清晰可见的帧\n2. 在目标物体中心位置点击\n3. AI 会自动跟踪它在整个视频中的位置"
                      : "1. Pause video on a frame where target is clearly visible\n2. Click the center of the target object\n3. AI will track it across all frames"}
                  </p>

                  {/* Click points list */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">
                      {isZh ? `已标记 ${samClickPoints.length} 个点` : `${samClickPoints.length} point(s) marked`}
                    </label>
                    {samClickPoints.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-gray-500 bg-white dark:bg-gray-800 rounded px-2 py-1">
                        <span>#{i + 1}: ({p.x}, {p.y}) F{p.frame}</span>
                        <button
                          onClick={() => setSamClickPoints((prev) => prev.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {samClickPoints.length > 0 && (
                      <button
                        onClick={() => setSamClickPoints([])}
                        className="text-xs text-red-500 hover:underline"
                      >
                        {isZh ? "清除所有" : "Clear all"}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleSamTrack}
                    disabled={samLoading || samClickPoints.length === 0 || !publicVideoUrl}
                    className="w-full py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {samLoading
                      ? (isZh ? "AI 跟踪中...（约30-45秒）" : "AI tracking... (~30-45s)")
                      : (isZh ? "开始跟踪" : "Start Tracking")}
                  </button>
                  {!publicVideoUrl && (
                    <p className="text-xs text-amber-600">
                      {isZh ? "视频上传中，请稍候..." : "Video uploading, please wait..."}
                    </p>
                  )}
                  {samMaskUrl && (
                    <div className="space-y-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400">
                        {isZh ? "跟踪完成！" : "Tracking complete!"}
                      </p>
                      <video
                        src={samMaskUrl}
                        controls
                        muted
                        className="w-full rounded-md"
                      />

                      {/* Replacement content upload */}
                      <div className="space-y-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {isZh ? "替换内容" : "Replacement Content"}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {isZh
                            ? "上传图片或视频，将替换到跟踪区域（白色区域）"
                            : "Upload image or video to composite onto tracked area (white region)"}
                        </p>

                        {replacePreviewUrl ? (
                          <div className="relative">
                            {replaceFile?.type.startsWith("video/") ? (
                              <video src={replacePreviewUrl} controls muted className="w-full rounded-md" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={replacePreviewUrl} alt="Replacement" className="w-full rounded-md" />
                            )}
                            <button
                              onClick={() => { setReplaceFile(null); setReplacePreviewUrl(null); }}
                              className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10 cursor-pointer hover:border-purple-400 transition-colors">
                            <span className="text-lg">+</span>
                            <span className="text-xs text-gray-500">
                              {isZh ? "上传替换素材" : "Upload replacement"}
                            </span>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                setReplaceFile(f);
                                setReplacePreviewUrl(URL.createObjectURL(f));
                              }}
                            />
                          </label>
                        )}

                        {/* Fill mode */}
                        {replaceFile && (
                          <div>
                            <label className="text-xs text-gray-500">{isZh ? "适配方式" : "Fit Mode"}</label>
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => setReplaceMode("fill")}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${replaceMode === "fill" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                              >
                                {isZh ? "填充" : "Fill"}
                              </button>
                              <button
                                onClick={() => setReplaceMode("fit")}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${replaceMode === "fit" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                              >
                                {isZh ? "适配" : "Fit"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Time range for replacement */}
                        {replaceFile && videoDuration > 0 && (
                          <div className="space-y-2 pt-2 border-t border-purple-100 dark:border-purple-800">
                            <label className="text-xs text-gray-500 font-medium">
                              {isZh ? "替换时间范围" : "Replacement Time Range"}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-400">{isZh ? "开始" : "Start"}</label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="range"
                                    min={0}
                                    max={videoDuration}
                                    step={0.1}
                                    value={replaceStartTime}
                                    onChange={(e) => setReplaceStartTime(Number(e.target.value))}
                                    className="flex-1 h-1.5 accent-purple-500"
                                  />
                                  <span className="text-[10px] text-gray-500 w-10 text-right">{replaceStartTime.toFixed(1)}s</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-400">{isZh ? "结束" : "End"}</label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="range"
                                    min={0}
                                    max={videoDuration}
                                    step={0.1}
                                    value={replaceEndTime}
                                    onChange={(e) => setReplaceEndTime(Number(e.target.value))}
                                    className="flex-1 h-1.5 accent-purple-500"
                                  />
                                  <span className="text-[10px] text-gray-500 w-10 text-right">{replaceEndTime.toFixed(1)}s</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { if (videoRef.current) { videoRef.current.currentTime = replaceStartTime; } }}
                                className="text-[10px] text-purple-600 hover:underline"
                              >
                                {isZh ? "预览起点" : "Preview start"}
                              </button>
                              <button
                                onClick={() => { if (videoRef.current) { videoRef.current.currentTime = replaceEndTime; } }}
                                className="text-[10px] text-purple-600 hover:underline"
                              >
                                {isZh ? "预览终点" : "Preview end"}
                              </button>
                            </div>
                          </div>
                        )}

                        {replaceFile && (
                          <p className="text-[11px] text-green-600 dark:text-green-400">
                            {isZh
                              ? `替换区间 ${replaceStartTime.toFixed(1)}s - ${replaceEndTime.toFixed(1)}s，点击「导出视频」合成`
                              : `Replace from ${replaceStartTime.toFixed(1)}s to ${replaceEndTime.toFixed(1)}s. Click "Export Video" to composite.`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">
                    {isZh ? "由 SAM2 (Meta) 提供 · ~$0.04/次" : "Powered by SAM2 (Meta) · ~$0.04/run"}
                  </p>
                </div>
              )}

              {/* AI Edit Panel */}
              {activeTool === "aiEdit" && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
                  <h3 className="text-sm font-medium text-amber-900 dark:text-amber-300">
                    ✨ {isZh ? "AI 智能编辑" : "AI Smart Edit"}
                  </h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {isZh
                      ? "用自然语言描述你想要的修改，AI 会重新生成视频"
                      : "Describe what you want to change in natural language. AI will regenerate the video."}
                  </p>
                  <div>
                    <label className="text-xs text-gray-500">{isZh ? "编辑指令" : "Edit instruction"}</label>
                    <textarea
                      value={aiEditPrompt}
                      onChange={(e) => setAiEditPrompt(e.target.value)}
                      placeholder={isZh
                        ? "例如：\n• 把手机屏幕换成产品广告图\n• 把背景换成海滩场景\n• 移除画面中的文字\n• 把视频风格改成水彩画"
                        : "e.g.:\n• Replace phone screen with product ad\n• Change background to beach\n• Remove text from video\n• Make it look like watercolor"}
                      className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      rows={4}
                    />
                  </div>

                  {/* Optional reference image */}
                  <div>
                    <label className="text-xs text-gray-500">{isZh ? "参考图片（可选）" : "Reference image (optional)"}</label>
                    {aiEditRefImage ? (
                      <div className="relative mt-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={aiEditRefImage} alt="" className="w-full rounded-md" />
                        <button
                          onClick={() => setAiEditRefImage(null)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center h-16 mt-1 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 cursor-pointer hover:border-amber-400 transition-colors">
                        <span className="text-xs text-gray-500">{isZh ? "上传参考图" : "Upload reference"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            // Upload to R2 for public URL
                            const form = new FormData();
                            form.append("file", f);
                            const res = await fetch("/api/toolbox/upload-image", { method: "POST", body: form });
                            if (res.ok) {
                              const data = await res.json();
                              setAiEditRefImage(data.url);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <button
                    onClick={handleAiEdit}
                    disabled={aiEditLoading || !aiEditPrompt.trim() || !publicVideoUrl}
                    className="w-full py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {aiEditLoading
                      ? (isZh ? "AI 编辑中...（约1-3分钟）" : "AI editing... (~1-3 min)")
                      : (isZh ? "开始 AI 编辑" : "Start AI Edit")}
                  </button>
                  {videoDuration > 10 && (
                    <p className="text-xs text-amber-600">
                      {isZh
                        ? `视频 ${videoDuration.toFixed(0)}s，将自动裁剪至前 10s 进行编辑`
                        : `Video is ${videoDuration.toFixed(0)}s, will auto-trim to first 10s`}
                    </p>
                  )}
                  {videoDuration > 0 && videoDuration < 2 && (
                    <p className="text-xs text-red-500">
                      {isZh ? "视频需至少 2 秒" : "Video must be at least 2 seconds"}
                    </p>
                  )}
                  {!publicVideoUrl && (
                    <p className="text-xs text-amber-600">
                      {isZh ? "视频上传中..." : "Video uploading..."}
                    </p>
                  )}

                  {aiEditResult && (
                    <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400">
                        {isZh ? "编辑完成！" : "Edit complete!"}
                      </p>
                      <video src={aiEditResult} controls muted className="w-full rounded-md" style={{ maxHeight: "40vh" }} />
                      <div className="flex gap-2">
                        <a
                          href={aiEditResult}
                          download
                          className="flex-1 text-center py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                        >
                          {isZh ? "下载" : "Download"}
                        </a>
                        <a
                          href={aiEditResult}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {isZh ? "新窗口" : "Open"}
                        </a>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400">
                    {isZh ? "由 Wan 2.7 VideoEdit 提供" : "Powered by Wan 2.7 VideoEdit"}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {!selectedText && !selectedMask && activeTool !== "smartTrack" && activeTool !== "aiEdit" && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {isZh ? "使用说明" : "Instructions"}
                  </h3>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
                    <li>{isZh ? '1. 点击 "T 添加文字" → 在视频上点击放置' : '1. Click "T Add Text" → click on video to place'}</li>
                    <li>{isZh ? '2. 点击 "⬛ 遮罩区域" → 在视频上拖拽框选' : '2. Click "⬛ Mask Area" → drag to select area'}</li>
                    <li>{isZh ? "3. 选中文字/遮罩后，在右侧编辑属性" : "3. Select text/mask to edit properties"}</li>
                    <li>{isZh ? '4. 点击 "导出视频" 处理' : '4. Click "Export Video" to process'}</li>
                  </ul>
                </div>
              )}

              {/* Elements list */}
              {(textOverlays.length > 0 || masks.length > 0) && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {isZh ? "图层" : "Layers"} ({textOverlays.length + masks.length})
                  </h3>
                  <div className="space-y-1">
                    {masks.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md ${selectedId === m.id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                      >
                        ⬛ {isZh ? "遮罩" : "Mask"} ({m.fill === "blur" ? (isZh ? "模糊" : "Blur") : m.fill})
                      </button>
                    ))}
                    {textOverlays.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedId(t.id)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md truncate ${selectedId === t.id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                      >
                        T {t.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
