/**
 * Polkadot API Console Filter
 * 
 * Suppresses verbose VEC decode errors from @polkadot/api that occur
 * when connecting to chains with different metadata versions.
 * 
 * This is a known issue when using newer versions of polkadot/api
 * with chains that have older metadata formats.
 */

const SUPPRESSED_PATTERNS = [
    'VEC:',
    'Unable to decode on index',
    'Si1TypeDef',
    'Si1Path',
    'Expected array/hex input to Vec',
];

let filterInstalled = false;

/**
 * Install the console filter
 * Call this once at app initialization
 */
export function installPolkadotErrorFilter(): void {
    if (typeof window === 'undefined') return;
    if (filterInstalled) return;

    const originalError = console.error;
    const originalWarn = console.warn;

    const shouldSuppress = (args: any[]): boolean => {
        const message = args.map(a =>
            typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' ');

        return SUPPRESSED_PATTERNS.some(pattern => message.includes(pattern));
    };

    console.error = (...args) => {
        if (!shouldSuppress(args)) {
            originalError.apply(console, args);
        }
    };

    console.warn = (...args) => {
        if (!shouldSuppress(args)) {
            originalWarn.apply(console, args);
        }
    };

    filterInstalled = true;
}

/**
 * Check if filter is already installed
 */
export function isFilterInstalled(): boolean {
    return filterInstalled;
}
