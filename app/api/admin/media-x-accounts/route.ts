import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { verifyUserExists } from "@/lib/x-client";
import { getUserXCredentials } from "@/lib/user-credentials";

export const dynamic = "force-dynamic";

// GET - Fetch all monitored accounts
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await prisma.mediaMonitorXAccounts.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Failed to load monitor accounts:", error);
    return NextResponse.json(
      { error: "Failed to load accounts" },
      { status: 500 }
    );
  }
}

// POST - Add new monitored account
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { username: string; xAccountId: string };
    const username = body.username?.trim().replace(/^@/, "");
    const xAccountId = body.xAccountId?.trim().replace(/^@/, "");

    if (!username || !xAccountId) {
      return NextResponse.json(
        { success: false, error: "用户名和 Account ID 不能为空" },
        { status: 400 }
      );
    }

    // Get decrypted credentials from current logged-in admin
    const user = await requireAdmin();
    const credentialsResult = await getUserXCredentials(user.id);

    if (!credentialsResult) {
      return NextResponse.json(
        { success: false, error: "您未配置X账号凭证,无法验证用户" },
        { status: 400 }
      );
    }

    // Verify X account exists
    const verification = await verifyUserExists(xAccountId, credentialsResult.credentials);

    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: `X账号验证失败: ${verification.error || "用户不存在"}` },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await prisma.mediaMonitorXAccounts.findFirst({
      where: {
        OR: [
          { username },
          { xAccountId }
        ]
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "该账号已在监控列表中" },
        { status: 400 }
      );
    }

    // Create new record
    await prisma.mediaMonitorXAccounts.create({
      data: {
        xAccountId,
        username,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add monitor account:", error);
    return NextResponse.json(
      { success: false, error: "添加失败" },
      { status: 500 }
    );
  }
}

// DELETE - Remove monitored account
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "缺少 ID" },
        { status: 400 }
      );
    }

    await prisma.mediaMonitorXAccounts.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete monitor account:", error);
    return NextResponse.json(
      { success: false, error: "删除失败" },
      { status: 500 }
    );
  }
}
