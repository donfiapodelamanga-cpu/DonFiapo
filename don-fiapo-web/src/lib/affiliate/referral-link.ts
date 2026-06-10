import { resolvePublicOrigin } from "../http/public-origin";

interface BuildReferralLinkInput {
  referralCode?: string | null;
  lunesAddress?: string | null;
  appOrigin?: string | null;
  nodeEnv?: string | null;
}

function resolveReferralCode(input: Pick<BuildReferralLinkInput, "referralCode" | "lunesAddress">): string {
  const explicitCode = input.referralCode?.trim();
  if (explicitCode) return explicitCode;

  const wallet = input.lunesAddress?.trim();
  if (!wallet) return "";

  return `REF-${wallet.slice(0, 8).toUpperCase()}`;
}

export function buildReferralLink(input: BuildReferralLinkInput = {}): string {
  const referralCode = resolveReferralCode(input);
  if (!referralCode) return "";

  const origin = resolvePublicOrigin({
    configuredOrigin: input.appOrigin ?? process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: input.nodeEnv ?? process.env.NODE_ENV,
  });

  return `${origin}/ref/${encodeURIComponent(referralCode)}`;
}
