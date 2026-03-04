import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, analyzeAccountFraud } from "@/lib/missions/verifiers/twitter";
import { findOrCreateUserByWallet } from "@/lib/missions/service";
import { applyTrustScoreDelta } from "@/lib/missions/fraud-engine";
import { recordReferral } from "@/lib/missions/referral-service";
import { resolveReferrerCode } from "@/lib/missions/referral-resolver";
import { db } from "@/lib/db";

/**
 * GET /api/auth/twitter/callback?code=...&state=...
 * Handles the OAuth 2.0 callback from Twitter.
 * Exchanges the code for tokens, fetches user info, saves to DB.
 */
export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const { searchParams } = req.nextUrl;
    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user denial
    if (error) {
      return NextResponse.redirect(`${APP_URL}/airdrop?tab=missions&x_error=denied`);
    }

    if (!code || !returnedState) {
      return NextResponse.redirect(`${APP_URL}/airdrop?tab=missions&x_error=missing_params`);
    }

    // Retrieve stored PKCE values from cookies
    const codeVerifier = req.cookies.get("x_oauth_code_verifier")?.value;
    const storedState = req.cookies.get("x_oauth_state")?.value;
    const wallet = req.cookies.get("x_oauth_wallet")?.value;

    if (!codeVerifier || !storedState || !wallet) {
      return NextResponse.redirect(`${APP_URL}/airdrop?tab=missions&x_error=session_expired`);
    }

    // Validate state to prevent CSRF
    if (returnedState !== storedState) {
      return NextResponse.redirect(`${APP_URL}/airdrop?tab=missions&x_error=state_mismatch`);
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn, user: xUser } = await exchangeCodeForTokens(
      code,
      codeVerifier
    );

    // Find or create user by wallet
    const userId = await findOrCreateUserByWallet(wallet);

    // Check if this X account is already linked to a different user (anti-sharing)
    const existingXLink = await db.user.findFirst({
      where: { xId: xUser.id, id: { not: userId } },
    });
    if (existingXLink) {
      return NextResponse.redirect(`${APP_URL}/airdrop?tab=missions&x_error=account_already_linked`);
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Save OAuth data to user
    await db.user.update({
      where: { id: userId },
      data: {
        xId: xUser.id,
        xUsername: xUser.username,
        xAccessToken: accessToken,
        xRefreshToken: refreshToken ?? null,
        xTokenExpiresAt: tokenExpiresAt,
        xAccountCreatedAt: xUser.createdAt ? new Date(xUser.createdAt) : null,
        xFollowersCount: xUser.publicMetrics?.followersCount ?? null,
        xFollowingCount: xUser.publicMetrics?.followingCount ?? null,
      },
    });

    // Run fraud analysis on account metrics
    const { fraudSignals, trustScoreDelta } = analyzeAccountFraud(xUser);
    if (fraudSignals.length > 0) {
      await applyTrustScoreDelta(userId, trustScoreDelta, fraudSignals);
    }

    // Process referral if present
    const refCode = req.cookies.get("x_oauth_ref")?.value;
    if (refCode) {
      try {
        const referrerId = await resolveReferrerCode(refCode);
        if (referrerId && referrerId !== userId) {
          const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            ?? req.headers.get("x-real-ip")
            ?? req.headers.get("cf-connecting-ip")
            ?? undefined;
          const userAgent = req.headers.get("user-agent") ?? undefined;

          await recordReferral(referrerId, userId, { ipAddress, userAgent });
        }
      } catch (refErr) {
        console.error("[AUTH_TWITTER_CALLBACK] Referral error (non-blocking):", refErr);
      }
    }

    // Clear OAuth cookies
    const response = NextResponse.redirect(`${APP_URL}/airdrop?tab=missions&x_connected=1`);
    response.cookies.delete("x_oauth_code_verifier");
    response.cookies.delete("x_oauth_state");
    response.cookies.delete("x_oauth_wallet");
    response.cookies.delete("x_oauth_ref");

    return response;
  } catch (error) {
    console.error("[AUTH_TWITTER_CALLBACK]", error);
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${APP_URL}/airdrop?tab=missions&x_error=internal`);
  }
}
