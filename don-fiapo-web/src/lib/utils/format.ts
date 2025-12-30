/**
 * Format a number with en-US locale for SSR consistency
 * This avoids hydration mismatch between server and client
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format address for display
 */
export function formatAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format balance with symbol
 */
export function formatBalance(balance: string, symbol = 'FIAPO'): string {
  const num = parseFloat(balance);
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B ${symbol}`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M ${symbol}`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K ${symbol}`;
  }
  return `${formatNumber(num)} ${symbol}`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Shorten number with suffix (K, M, B)
 */
export function shortenNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

