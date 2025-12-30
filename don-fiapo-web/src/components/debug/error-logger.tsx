"use client";

/**
 * Error Logger - Captures browser console errors during navigation
 * 
 * Usage: Import this component once in your root layout
 * Errors are stored in localStorage and can be exported
 */

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface CapturedError {
    id: string;
    timestamp: string;
    type: 'error' | 'warn' | 'unhandled';
    message: string;
    stack?: string;
    source?: string;
    page: string;
    category?: string;
}

const ERROR_STORAGE_KEY = 'don-fiapo-debug-errors';
const MAX_ERRORS = 100;

// Categorize errors for easier task generation
function categorizeError(message: string): string {
    if (message.includes('hydration') || message.includes('Hydration')) return 'Hydration';
    if (message.includes('window') || message.includes('document')) return 'SSR';
    if (message.includes('wallet') || message.includes('Wallet')) return 'Wallet';
    if (message.includes('contract') || message.includes('Contract')) return 'Contract';
    if (message.includes('ResponsiveContainer') || message.includes('chart')) return 'Chart';
    if (message.includes('fetch') || message.includes('network') || message.includes('API')) return 'Network';
    if (message.includes('undefined') || message.includes('null')) return 'Null Reference';
    if (message.includes('TypeError')) return 'Type Error';
    return 'Other';
}

// Patterns to ignore (known polkadot/api metadata issues with Lunes Network)
const IGNORED_PATTERNS = [
    'VEC:',
    'Unable to decode on index',
    'Si1TypeDef',
    'Si1Path',
    'Expected array/hex input to Vec',
    'ContractMetadata',
    'Enum(tuple)',
];

// Check if error should be suppressed
function shouldIgnoreError(message: string): boolean {
    return IGNORED_PATTERNS.some(pattern => message.includes(pattern));
}


// Get stored errors
export function getStoredErrors(): CapturedError[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(ERROR_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Clear stored errors
export function clearStoredErrors(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ERROR_STORAGE_KEY);
    console.log('[ErrorLogger] Errors cleared');
}

// Export errors as Markdown task list
export function exportErrorsAsTaskMd(): string {
    const errors = getStoredErrors();
    if (errors.length === 0) return '# Nenhum erro capturado\n';

    // Group by category
    const grouped = errors.reduce((acc, err) => {
        const cat = err.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(err);
        return acc;
    }, {} as Record<string, CapturedError[]>);

    let md = `# Error Tasks - ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    md += `> Capturados: ${errors.length} erros\n\n`;

    for (const [category, categoryErrors] of Object.entries(grouped)) {
        md += `## ${category} (${categoryErrors.length})\n\n`;

        // De-duplicate by message
        const uniqueMessages = new Map<string, CapturedError>();
        for (const err of categoryErrors) {
            const key = err.message.substring(0, 100);
            if (!uniqueMessages.has(key)) {
                uniqueMessages.set(key, err);
            }
        }

        let idx = 0;
        for (const [, err] of uniqueMessages) {
            idx++;
            md += `- [ ] **${err.type.toUpperCase()}**: ${err.message.substring(0, 150)} <!-- id: ${category.toLowerCase()}-${idx} -->\n`;
            md += `  - Página: \`${err.page}\`\n`;
            if (err.source) md += `  - Fonte: \`${err.source}\`\n`;
            md += `  - Timestamp: ${err.timestamp}\n\n`;
        }
    }

    return md;
}

// Download errors as file
export function downloadErrorTasksMd(): void {
    const content = exportErrorsAsTaskMd();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-tasks-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

// Log to console for visibility
export function logErrorSummary(): void {
    const errors = getStoredErrors();
    console.group('[ErrorLogger] Summary');
    console.log(`Total errors: ${errors.length}`);

    const byCategory = errors.reduce((acc, e) => {
        acc[e.category || 'Other'] = (acc[e.category || 'Other'] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.table(byCategory);
    console.log('Commands: window.__errorLogger.clear(), window.__errorLogger.download(), window.__errorLogger.export()');
    console.groupEnd();
}

// Main component
export function ErrorLogger() {
    const pathname = usePathname();

    const storeError = useCallback((error: Omit<CapturedError, 'id' | 'timestamp' | 'page' | 'category'>) => {
        if (typeof window === 'undefined') return;

        const newError: CapturedError = {
            ...error,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            page: pathname || window.location.pathname,
            category: categorizeError(error.message),
        };

        try {
            const stored = getStoredErrors();
            const updated = [newError, ...stored].slice(0, MAX_ERRORS);
            localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.warn('[ErrorLogger] Failed to store error:', e);
        }
    }, [pathname]);

    useEffect(() => {
        // Override console.error
        const originalError = console.error;
        console.error = (...args) => {
            const message = args.map(a =>
                typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(' ');

            // Skip ignored patterns (polkadot/api metadata errors)
            if (shouldIgnoreError(message)) {
                return; // Suppress completely
            }

            originalError.apply(console, args);
            storeError({ type: 'error', message });
        };

        // Override console.warn (optional - can be noisy)
        const originalWarn = console.warn;
        console.warn = (...args) => {
            const message = args.map(a =>
                typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(' ');

            // Skip ignored patterns
            if (shouldIgnoreError(message)) {
                return; // Suppress completely
            }

            originalWarn.apply(console, args);
            // Only capture React/important warnings
            if (message.includes('React') || message.includes('Warning')) {
                storeError({ type: 'warn', message });
            }
        };


        // Capture unhandled errors
        const handleError = (event: ErrorEvent) => {
            storeError({
                type: 'unhandled',
                message: event.message,
                stack: event.error?.stack,
                source: `${event.filename}:${event.lineno}:${event.colno}`,
            });
        };

        // Capture unhandled promise rejections
        const handleRejection = (event: PromiseRejectionEvent) => {
            const message = event.reason?.message || String(event.reason);
            storeError({
                type: 'unhandled',
                message: `Unhandled Promise: ${message}`,
                stack: event.reason?.stack,
            });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        // Expose global API for debugging
        (window as any).__errorLogger = {
            errors: getStoredErrors,
            clear: clearStoredErrors,
            export: exportErrorsAsTaskMd,
            download: downloadErrorTasksMd,
            summary: logErrorSummary,
        };

        console.log('[ErrorLogger] Active. Use window.__errorLogger.summary() to see captured errors.');

        return () => {
            console.error = originalError;
            console.warn = originalWarn;
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [storeError]);

    return null;
}
