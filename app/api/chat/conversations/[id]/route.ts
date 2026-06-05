import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";

export const dynamic = "force-dynamic";

async function ownConversation(userId: string, id: string) {
  return prisma.chatConversation.findFirst({
    where: { id, userId },
    select: { id: true },
  });
}

// PATCH /api/chat/conversations/[id] → rename a conversation.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  if (!(await ownConversation(user.id, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const title = (body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const updated = await prisma.chatConversation.update({
    where: { id },
    data: { title: title.slice(0, 120) },
    select: { id: true, title: true, model: true, updatedAt: true },
  });

  return NextResponse.json({ conversation: updated });
}

// DELETE /api/chat/conversations/[id] → delete a conversation and its messages.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  if (!(await ownConversation(user.id, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.chatConversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
