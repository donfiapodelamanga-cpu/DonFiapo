import { TwitterApi, UserFollowingV2Paginator, TweetLikingUsersV2Paginator, TweetRetweetersUsersV2Paginator } from "twitter-api-v2";

const CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const CALLBACK_URL = process.env.TWITTER_CALLBACK_URL ?? "http://localhost:3000/api/auth/twitter/callback";

export interface TwitterUserInfo {
  id: string;
  username: string;
  name: string;
  createdAt: string | null;
  publicMetrics: {
    followersCount: number;
    followingCount: number;
    tweetCount: number;
  } | null;
}

export interface TwitterVerificationResult {
  verified: boolean;
  reason?: string;
}

// ==========================================
// OAuth 2.0 PKCE helpers
// ==========================================

/**
 * Generates the OAuth 2.0 authorization URL and code_verifier for PKCE flow.
 * Scopes confirmed against official X API v2 docs:
 *   tweet.read, users.read, follows.read, like.read, offline.access (required for refresh tokens).
 */
export async function generateAuthUrl(): Promise<{
  url: string;
  codeVerifier: string;
  state: string;
}> {
  const client = new TwitterApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(CALLBACK_URL, {
    scope: ["tweet.read", "users.read", "follows.read", "like.read", "offline.access"],
  });
  return { url, codeVerifier, state };
}

/**
 * Exchanges the OAuth code for tokens and retrieves user info.
 * Uses GET /2/users/me with user.fields=[created_at, public_metrics].
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number;
  user: TwitterUserInfo;
}> {
  const client = new TwitterApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
  const { accessToken, refreshToken, expiresIn, client: loggedClient } =
    await client.loginWithOAuth2({ code, codeVerifier, redirectUri: CALLBACK_URL });

  const meData = await loggedClient.v2.me({
    "user.fields": ["created_at", "public_metrics"],
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: expiresIn ?? 7200,
    user: {
      id: meData.data.id,
      username: meData.data.username,
      name: meData.data.name,
      createdAt: (meData.data as any).created_at ?? null,
      publicMetrics: (meData.data as any).public_metrics
        ? {
            followersCount: (meData.data as any).public_metrics.followers_count,
            followingCount: (meData.data as any).public_metrics.following_count,
            tweetCount: (meData.data as any).public_metrics.tweet_count,
          }
        : null,
    },
  };
}

/**
 * Refreshes an expired access token using the refresh token.
 * Requires offline.access scope to have been granted during initial auth.
 * POST https://api.x.com/2/oauth2/token with grant_type=refresh_token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number;
}> {
  const client = new TwitterApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
  const result = await client.refreshOAuth2Token(refreshToken);
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn ?? 7200,
  };
}

// ==========================================
// Verification helpers (use user's access token)
// ==========================================

function buildUserClient(accessToken: string) {
  return new TwitterApi(accessToken);
}

/**
 * Verify if a user follows a target account.
 * Endpoint: GET /2/users/:id/following
 * Rate limit: 15 req/15min per user (docs confirmed).
 *
 * Uses asPaginator:true overload — iterates via AsyncIterator (Symbol.asyncIterator).
 * Each iteration yields a single UserV2 item.
 * Stops early as soon as the target is found to minimize API calls.
 * Fix vs original: original fetched only 1 page; users following >1000 accounts would fail.
 */
export async function verifyFollow(
  xUserId: string,
  accessToken: string,
  targetAccountId: string
): Promise<TwitterVerificationResult> {
  try {
    const client = buildUserClient(accessToken);
    const paginator: UserFollowingV2Paginator = await client.v2.following(xUserId, {
      max_results: 1000,
      asPaginator: true,
    });

    for await (const user of paginator) {
      if (user.id === targetAccountId) return { verified: true };
    }

    return { verified: false, reason: "User does not follow the target account" };
  } catch (err: any) {
    return { verified: false, reason: `Twitter API error: ${err?.message ?? "unknown"}` };
  }
}

/**
 * Verify if a user liked a specific tweet.
 * Endpoint: GET /2/tweets/:id/liking_users  (method: client.v2.tweetLikedBy)
 * Rate limit: 75 req/15min (docs confirmed).
 *
 * Fix vs original: inverted approach. Instead of listing all tweets the user liked
 * (GET /2/users/:id/liked_tweets returns only the 100 most recent), we check
 * who liked the target tweet — more reliable and stops early on first match.
 * Paginates through all liking users (max 100/page).
 */
export async function verifyLike(
  xUserId: string,
  accessToken: string,
  tweetId: string
): Promise<TwitterVerificationResult> {
  try {
    const client = buildUserClient(accessToken);
    const paginator: TweetLikingUsersV2Paginator = await client.v2.tweetLikedBy(tweetId, {
      max_results: 100,
      asPaginator: true,
    });

    for await (const user of paginator) {
      if (user.id === xUserId) return { verified: true };
    }

    return { verified: false, reason: "User has not liked the target tweet" };
  } catch (err: any) {
    return { verified: false, reason: `Twitter API error: ${err?.message ?? "unknown"}` };
  }
}

/**
 * Verify if a user retweeted a specific tweet.
 * Endpoint: GET /2/tweets/:id/retweeted_by  (method: client.v2.tweetRetweetedBy)
 * Rate limit: 75 req/15min (docs confirmed).
 *
 * Fix vs original: added full pagination. Original single page (max 100) would miss
 * the user on viral tweets with many retweets.
 */
export async function verifyRepost(
  accessToken: string,
  tweetId: string,
  xUserId: string
): Promise<TwitterVerificationResult> {
  try {
    const client = buildUserClient(accessToken);
    const paginator: TweetRetweetersUsersV2Paginator = await client.v2.tweetRetweetedBy(tweetId, {
      max_results: 100,
      asPaginator: true,
    });

    for await (const user of paginator) {
      if (user.id === xUserId) return { verified: true };
    }

    return { verified: false, reason: "User has not reposted the target tweet" };
  } catch (err: any) {
    return { verified: false, reason: `Twitter API error: ${err?.message ?? "unknown"}` };
  }
}

/**
 * Verify if a user commented on a tweet with a required keyword.
 * Endpoint: GET /2/tweets/search/recent with conversation_id operator.
 * Rate limit: 300 req/15min per user (docs confirmed).
 *
 * WARNING: The conversation_id: operator requires X API Basic tier ($100/mo) or higher.
 * It is NOT available on the Free tier and will return HTTP 403 if used there.
 * Ensure your X Developer App is on Basic+ before enabling COMMENT mission types.
 */
export async function verifyComment(
  xUserId: string,
  accessToken: string,
  tweetId: string,
  requiredKeyword?: string
): Promise<TwitterVerificationResult> {
  try {
    const client = buildUserClient(accessToken);
    const query = `conversation_id:${tweetId} from:${xUserId}`;
    const results = await client.v2.search(query, {
      max_results: 10,
      "tweet.fields": ["text", "author_id"],
    });

    if (!results.data?.data?.length) {
      return { verified: false, reason: "No reply found from user on the target tweet" };
    }

    if (requiredKeyword) {
      const hasKeyword = results.data.data.some((t) =>
        t.text.toLowerCase().includes(requiredKeyword.toLowerCase())
      );
      return {
        verified: hasKeyword,
        reason: hasKeyword
          ? undefined
          : `Comment does not contain required keyword: "${requiredKeyword}"`,
      };
    }

    return { verified: true };
  } catch (err: any) {
    return { verified: false, reason: `Twitter API error: ${err?.message ?? "unknown"}` };
  }
}

// ==========================================
// Fraud signals analysis
// ==========================================

/**
 * Analyzes account metrics for bot/fraud signals.
 * Returns a list of detected signals and a trustScore delta.
 */
export function analyzeAccountFraud(user: TwitterUserInfo): {
  fraudSignals: string[];
  trustScoreDelta: number;
} {
  const signals: string[] = [];
  let delta = 0;

  if (user.createdAt) {
    const ageMs = Date.now() - new Date(user.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      signals.push("X_ACCOUNT_TOO_NEW_7D");
      delta -= 40;
    } else if (ageDays < 30) {
      signals.push("X_ACCOUNT_TOO_NEW_30D");
      delta -= 20;
    }
  }

  if (user.publicMetrics) {
    const { followersCount, followingCount, tweetCount } = user.publicMetrics;

    if (followersCount < 5 && followingCount > 100) {
      signals.push("X_BOT_RATIO_SUSPICIOUS");
      delta -= 25;
    }

    if (tweetCount === 0) {
      signals.push("X_ZERO_TWEETS");
      delta -= 15;
    }

    if (followingCount > 5000 && followersCount < 50) {
      signals.push("X_MASS_FOLLOWING_NO_AUDIENCE");
      delta -= 20;
    }
  }

  return { fraudSignals: signals, trustScoreDelta: delta };
}
