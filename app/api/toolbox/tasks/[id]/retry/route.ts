import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const task = await prisma.mediaTask.findFirst({
    where: { id, userId: user.id },
  });

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Reset task to pending so the processor picks it up
  await prisma.mediaTask.update({
    where: { id },
    data: {
      status: "pending",
      error: null,
      pollAttempts: 0,
      providerTaskId: null,
      completedAt: null,
    },
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
