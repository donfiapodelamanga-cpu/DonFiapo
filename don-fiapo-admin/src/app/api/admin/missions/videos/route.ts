import { NextRequest, NextResponse } from "next/server";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";
  try {
    const res = await fetchWebApi(`/api/admin/missions/videos?status=${encodeURIComponent(status)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_VIDEOS_PROXY_GET]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetchWebApi("/api/admin/missions/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_VIDEOS_PROXY_POST]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}
