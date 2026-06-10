type EnvLike = Record<string, string | undefined>;

function firstNonBlank(...values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }

  return "";
}

export function resolveSpinGameContractAddress(env: EnvLike = process.env): string {
  return firstNonBlank(
    env.NEXT_PUBLIC_SPIN_GAME_CONTRACT,
    env.NEXT_PUBLIC_SPIN_GAME_CONTRACT_ADDRESS,
  );
}
