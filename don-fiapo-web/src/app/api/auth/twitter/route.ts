import { NextRequest, NextResponse } from "next/server";
import { generateAuthUrl } from "@/lib/missions/verifiers/twitter";

/**
 * GET /api/auth/twitter?wallet=<address>
 * Starts the Twitter OAuth 2.0 PKCE flow.
 * Redirects the user to Twitter's authorization page.
 * The wallet address is stored in the state param to recover identity after callback.
 */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return NextResponse.redirect(`${APP_URL}/airdrop?tab=missions&x_error=not_configured`);
    }

    const wallet = req.nextUrl.searchParams.get("wallet");
    if (!wallet) {
      return NextResponse.json({ error: "wallet param required" }, { status: 400 });
    }

    // Optional referral code (from /ref/<code> or ?ref=<code>)
    const refCode = req.nextUrl.searchParams.get("ref") ?? undefined;

    const { url, codeVerifier, state } = await generateAuthUrl();

    // Build the response with a redirect
    const response = NextResponse.redirect(url);

    // Store codeVerifier and original state in HttpOnly cookies (server-side session)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 600, // 10 minutes to complete OAuth
      path: "/",
    };

    response.cookies.set("x_oauth_code_verifier", codeVerifier, cookieOptions);
    response.cookies.set("x_oauth_state", state, cookieOptions);
    response.cookies.set("x_oauth_wallet", wallet, cookieOptions);
    if (refCode) {
      response.cookies.set("x_oauth_ref", refCode, cookieOptions);
    }

    return response;
  } catch (error) {
    console.error("[AUTH_TWITTER_START]", error);
    return NextResponse.json({ error: "Failed to start Twitter OAuth" }, { status: 500 });
  }
}
