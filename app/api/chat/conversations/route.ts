import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";

export const dynamic = "force-dynamic";

// GET /api/chat/conversations → list the user's conversations (newest first).
export async function GET() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const conversations = await prisma.chatConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, model: true, updatedAt: true },
    take: 100,
  });

  return NextResponse.json({ conversations });
}
