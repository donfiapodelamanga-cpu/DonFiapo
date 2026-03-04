import crypto from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const GROUP_ID = process.env.TELEGRAM_GROUP_ID!; // e.g. "-1001234567890"

export interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramVerificationResult {
  verified: boolean;
  reason?: string;
}

// ==========================================
// Telegram Login Widget validation
// ==========================================

/**
 * Validates data received from the Telegram Login Widget.
 * The hash is computed using HMAC-SHA256 with SHA256(BOT_TOKEN) as key.
 * See: https://core.telegram.org/widgets/login#checking-authorization
 */
export function validateTelegramLogin(data: TelegramLoginData): TelegramVerificationResult {
  const { hash, ...rest } = data;

  // Build the data-check-string
  const checkString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${(rest as Record<string, unknown>)[key]}`)
    .join("\n");

  // Key is SHA256 of the bot token
  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  if (computedHash !== hash) {
    return { verified: false, reason: "Invalid Telegram login signature" };
  }

  // Reject logins older than 1 hour
  const ageSeconds = Math.floor(Date.now() / 1000) - data.auth_date;
  if (ageSeconds > 3600) {
    return { verified: false, reason: "Telegram login data is expired (> 1h)" };
  }

  return { verified: true };
}

// ==========================================
// Group membership verification via Bot API
// ==========================================

/**
 * Verifies if a Telegram user is currently a member of the project group/channel.
 * Uses getChatMember endpoint from the Bot API.
 * Statuses: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked"
 */
export async function verifyTelegramMembership(
  telegramUserId: string | number,
  groupId: string = GROUP_ID
): Promise<TelegramVerificationResult> {
  if (!BOT_TOKEN) {
    return { verified: false, reason: "Telegram bot not configured" };
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: groupId,
        user_id: Number(telegramUserId),
      }),
    });

    if (!res.ok) {
      return { verified: false, reason: `Telegram API HTTP error: ${res.status}` };
    }

    const json = await res.json();

    if (!json.ok) {
      return {
        verified: false,
        reason: `Telegram API error: ${json.description ?? "unknown"}`,
      };
    }

    const status: string = json.result?.status;
    const activeMemberStatuses = ["creator", "administrator", "member", "restricted"];
    const isMember = activeMemberStatuses.includes(status);

    return {
      verified: isMember,
      reason: isMember
        ? undefined
        : `User is not a member of the group (status: ${status})`,
    };
  } catch (err: any) {
    return {
      verified: false,
      reason: `Failed to contact Telegram API: ${err?.message ?? "unknown"}`,
    };
  }
}
