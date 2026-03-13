import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth0";
import { ensureReferralCode, getReferralStats, attributeReferral } from "@/lib/referral";

// GET: return referral code + stats
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const stats = await getReferralStats(user.id);
  return NextResponse.json(stats);
}

// POST: generate referral code (if not exists) or attribute referral
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json().catch(() => ({}));

  // If refCode is provided, attribute the referral
  if (body.refCode) {
    const success = await attributeReferral(user.id, body.refCode);
    return NextResponse.json({ success });
  }

  // Otherwise, generate/return referral code
  const code = await ensureReferralCode(user.id);
  const stats = await getReferralStats(user.id);
  return NextResponse.json({ ...stats, referralCode: code });
}
