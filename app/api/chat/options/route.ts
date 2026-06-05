import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, unauthorizedResponse } from "@/lib/auth0";
import { getChatModelOptions } from "@/lib/chat";

export const dynamic = "force-dynamic";

// GET /api/chat/options → model list (with lock flags), subscription + balance.
export async function GET() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      subscriptionStatus: true,
      subscriptionTier: true,
      creditBalanceCents: true,
    },
  });

  const isSubscriber = record?.subscriptionStatus === "active";

  return NextResponse.json({
    models: getChatModelOptions(isSubscriber),
    isSubscriber,
    tier: record?.subscriptionTier ?? null,
    balanceCents: record?.creditBalanceCents ?? 0,
  });
}
