import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";

/**
 * GET /api/v1/auth/verify
 *
 * Verify an xPilot API key. Used by the Cloudflare Worker MCP server
 * to authenticate incoming requests before processing.
 *
 * Returns 200 with { userId, apiKeyId } on success, 401 on failure.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request.headers.get("authorization"));

  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    userId: auth.userId,
    apiKeyId: auth.apiKeyId,
  });
}
