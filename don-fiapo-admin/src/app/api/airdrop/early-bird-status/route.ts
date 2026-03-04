import { NextRequest, NextResponse } from "next/server";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${WEB_API}/api/airdrop/early-bird-status`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[EARLY_BIRD_PROXY]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}
