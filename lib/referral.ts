import { prisma } from "./db";
import crypto from "crypto";

const COMMISSION_RATE = 0.05; // 5%

export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex"); // 8-char hex
}

/** Ensure a user has a referral code; generate one if missing. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (user?.referralCode) return user.referralCode;

  // Generate a unique code (retry on collision)
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      return updated.referralCode!;
    } catch {
      // Unique constraint violation — retry
    }
  }
  throw new Error("Failed to generate unique referral code");
}

/** Attribute a referral: set referredByUserId if the user hasn't been referred yet. */
export async function attributeReferral(
  userId: string,
  refCode: string,
): Promise<boolean> {
  if (!refCode) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredByUserId: true, referralCode: true },
  });

  // Already referred or trying to self-refer
  if (user?.referredByUserId) return false;
  if (user?.referralCode === refCode) return false;

  const referrer = await prisma.user.findFirst({
    where: { referralCode: refCode },
    select: { id: true },
  });
  if (!referrer || referrer.id === userId) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { referredByUserId: referrer.id },
  });

  return true;
}

/** Record a commission for the referrer when a referred user pays. */
export async function recordCommission(params: {
  referredUserId: string;
  paymentAmountCents: number;
  sourceType: "topup" | "subscription";
  stripeSessionId: string;
}): Promise<void> {
  // 1. Look up who referred this user
  const user = await prisma.user.findUnique({
    where: { id: params.referredUserId },
    select: { referredByUserId: true },
  });
  if (!user?.referredByUserId) return;

  // 2. Idempotency check
  const existing = await prisma.referralCommission.findFirst({
    where: { stripeSessionId: params.stripeSessionId },
  });
  if (existing) return;

  // 3. Calculate 5% commission
  const commissionCents = Math.max(
    1,
    Math.floor(params.paymentAmountCents * COMMISSION_RATE),
  );

  // 4. Credit the referrer and create audit record
  const updatedReferrer = await prisma.user.update({
    where: { id: user.referredByUserId },
    data: { creditBalanceCents: { increment: commissionCents } },
    select: { creditBalanceCents: true },
  });

  await prisma.creditTransaction.create({
    data: {
      userId: user.referredByUserId,
      type: "referral_commission",
      amountCents: commissionCents,
      balanceAfter: updatedReferrer.creditBalanceCents,
      description: `Referral commission (5%) from ${params.sourceType}`,
      stripeSessionId: params.stripeSessionId,
    },
  });

  await prisma.referralCommission.create({
    data: {
      referrerId: user.referredByUserId,
      referredUserId: params.referredUserId,
      sourceType: params.sourceType,
      sourceAmountCents: params.paymentAmountCents,
      commissionCents,
      stripeSessionId: params.stripeSessionId,
    },
  });

  console.log(
    `Referral commission: ${commissionCents}¢ credited to ${user.referredByUserId}`,
  );
}

/** Get referral stats for a user. */
export async function getReferralStats(userId: string) {
  const [user, referralCount, commissions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    }),
    prisma.user.count({
      where: { referredByUserId: userId },
    }),
    prisma.referralCommission.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const totalEarnedCents = commissions.reduce(
    (sum, c) => sum + c.commissionCents,
    0,
  );

  return {
    referralCode: user?.referralCode ?? null,
    totalReferred: referralCount,
    totalEarnedCents,
    recentCommissions: commissions.map((c) => ({
      id: c.id,
      sourceType: c.sourceType,
      sourceAmountCents: c.sourceAmountCents,
      commissionCents: c.commissionCents,
      createdAt: c.createdAt,
    })),
  };
}
