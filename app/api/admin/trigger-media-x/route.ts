import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { syncMonitoredAccounts, type ReportPeriod } from "@/lib/media-x";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parsePeriod(input: string | null): ReportPeriod {
  return input === "weekly" ? "weekly" : "daily";
}

function parseDateParam(input: string | null): Date | null {
  if (!input) return null;
  const match = input.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
  if (!match) return null;
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return isNaN(d.getTime()) ? null : d;
}

async function handle(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const userId = user.id;

    const period = parsePeriod(request.nextUrl.searchParams.get("period"));
    const dateParam = request.nextUrl.searchParams.get("date");
    const targetDate = parseDateParam(dateParam);

    if (dateParam && !targetDate) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const result = await syncMonitoredAccounts(
      userId,
      period,
      20,
      targetDate ?? undefined,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "No monitored accounts found or sync failed." },
        { status: 200 },
      );
    }

    revalidatePath("/zh/media-x");
    revalidatePath("/en/media-x");
    revalidatePath("/media-x");

    return NextResponse.json({
      success: true,
      period,
      reportDate: result.reportDate,
      accountCount: result.accountCount,
      totalTweets: result.totalTweets,
      sourceCount: result.sourceCount,
      usedAi: result.usedAi,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
