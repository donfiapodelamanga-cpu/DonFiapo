import { NextRequest, NextResponse } from "next/server";
import { verifyCompletion } from "@/lib/missions/service";

/**
 * POST /api/missions/verify
 * Body: { completionId: string, approved: boolean, reason?: string }
 * Admin endpoint to verify/reject a mission completion
 */
export async function POST(req: NextRequest) {
  try {
    // Simple admin key check (in production, use proper auth)
    const adminKey = req.headers.get("x-admin-key");
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { completionId, approved, reason } = body;

    if (!completionId || typeof approved !== "boolean") {
      return NextResponse.json({ error: "completionId and approved are required" }, { status: 400 });
    }

    await verifyCompletion(completionId, approved, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VERIFY_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
