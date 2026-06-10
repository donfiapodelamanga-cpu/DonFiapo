import assert from "node:assert/strict";
import test from "node:test";

import { buildReferralLink } from "./referral-link";

test("builds referral links from the configured public app origin", () => {
  assert.equal(
    buildReferralLink({
      referralCode: "REF-ROYAL",
      appOrigin: "https://donfiapo.fun",
      nodeEnv: "production",
    }),
    "https://donfiapo.fun/ref/REF-ROYAL",
  );
});

test("falls back to a deterministic wallet referral code", () => {
  assert.equal(
    buildReferralLink({
      lunesAddress: "abc12345zzzz",
      appOrigin: "https://donfiapo.fun",
      nodeEnv: "production",
    }),
    "https://donfiapo.fun/ref/REF-ABC12345",
  );
});

test("encodes referral codes before putting them in the URL path", () => {
  assert.equal(
    buildReferralLink({
      referralCode: " REF royal/one ",
      appOrigin: "https://donfiapo.fun",
      nodeEnv: "production",
    }),
    "https://donfiapo.fun/ref/REF%20royal%2Fone",
  );
});

test("returns an empty link without a referral code or wallet", () => {
  assert.equal(
    buildReferralLink({
      appOrigin: "https://donfiapo.fun",
      nodeEnv: "production",
    }),
    "",
  );
});
