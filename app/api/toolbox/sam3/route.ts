import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { runSAMVideoSegmentation } from "@/lib/replicate-sam3";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { videoUrl, clickPoints, clickLabels, clickFrame, clickFrames, objectLabel } = body as {
    videoUrl: string;
    clickPoints: { x: number; y: number }[];
    clickLabels?: number[];
    clickFrame?: number;
    clickFrames?: number[];
    objectLabel?: string;
  };

  if (!videoUrl) {
    return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
  }
  if (!clickPoints || clickPoints.length === 0) {
    return NextResponse.json({ error: "Click at least one point on the video" }, { status: 400 });
  }

  try {
    const result = await runSAMVideoSegmentation({
      videoUrl,
      clickPoints,
      clickLabels,
      clickFrames: clickFrames ?? (clickFrame !== undefined ? clickPoints.map(() => clickFrame) : undefined),
      objectLabel,
    });

    if (result.status === "failed") {
      return NextResponse.json({ error: result.error ?? "Tracking failed" }, { status: 500 });
    }

    return NextResponse.json({ maskVideoUrl: result.maskVideoUrl });
  } catch (err) {
    console.error("[SAM2 API] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tracking failed" },
      { status: 500 },
    );
  }
}
