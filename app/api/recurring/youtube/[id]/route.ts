import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, addWeeks } from "date-fns";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";

function calculateNextRun(frequency: string, cronExpr: string): Date {
  const now = new Date();
  const [hours, minutes] = cronExpr.split(":").map(Number);
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun <= now) {
    if (frequency === "daily") {
      nextRun = addDays(nextRun, 1);
    } else if (frequency === "weekly") {
      nextRun = addWeeks(nextRun, 1);
    }
  }

  return nextRun;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { id: scheduleId } = await params;
  const schedule = await prisma.recurringYoutubeSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule || schedule.userId !== user.id) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.aiPrompt !== undefined) updateData.aiPrompt = body.aiPrompt || null;
  if (body.aiLanguage !== undefined) updateData.aiLanguage = body.aiLanguage || null;
  if (body.model !== undefined) updateData.model = body.model || null;
  if (body.aspectRatio !== undefined) updateData.aspectRatio = body.aspectRatio || null;
  if (body.duration !== undefined) updateData.duration = body.duration || null;
  if (body.trendRegion !== undefined) updateData.trendRegion = body.trendRegion || null;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  if (body.frequency && body.cronExpr) {
    updateData.frequency = body.frequency;
    updateData.cronExpr = body.cronExpr;
    updateData.nextRunAt = calculateNextRun(body.frequency, body.cronExpr);
  }

  const updated = await prisma.recurringYoutubeSchedule.update({
    where: { id: scheduleId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { id: scheduleId } = await params;
  const schedule = await prisma.recurringYoutubeSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule || schedule.userId !== user.id) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  await prisma.recurringYoutubeSchedule.delete({
    where: { id: scheduleId },
  });

  return NextResponse.json({ success: true });
}
