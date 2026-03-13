/**
 * Format large numbers for display.
 * 10000+ → "1.0w"  |  1000+ → "1.0k"  |  else → raw string
 */
export function formatNumber(n: number): string {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return String(n)
}

/**
 * Format a percentage value.
 * Always returns an integer string capped at 100, e.g. "85%"
 */
export function formatPercent(n: number): string {
    return Math.min(100, Math.round(n)) + '%'
}
