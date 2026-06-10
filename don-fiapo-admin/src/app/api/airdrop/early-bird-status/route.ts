import { NextRequest, NextResponse } from "next/server";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";

export async function GET(req: NextRequest) {
  try {
    const res = await fetchWebApi("/api/airdrop/early-bird-status", {
      cache: "no-store",
    }, { protected: false });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[EARLY_BIRD_PROXY]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}
