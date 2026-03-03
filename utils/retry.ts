import { CloudError } from '@/services/cloud'

/**
 * Retry wrapper with incremental backoff.
 *
 * Usage:
 *   const data = await withRetry(() => habitService.getHabits())
 *
 * Only retries transient errors (timeout, network). Business errors
 * and permission errors are thrown immediately.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number
        delay?: number
        shouldRetry?: (err: unknown) => boolean
    } = {},
): Promise<T> {
    const {
        maxRetries = 2,
        delay = 1000,
        shouldRetry = defaultShouldRetry,
    } = options

    let lastError: unknown

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err

            if (attempt < maxRetries && shouldRetry(err)) {
                // Incremental backoff: 1s, 2s, 3s…
                await new Promise((r) => setTimeout(r, delay * (attempt + 1)))
                continue
            }

            throw err
        }
    }

    throw lastError
}

/**
 * Default retry predicate:
 * - Timeout (code -2) and network (code -5) errors → retry
 * - Business errors, permission errors, unknown errors → do not retry
 */
function defaultShouldRetry(err: unknown): boolean {
    if (err instanceof CloudError) {
        return (err as CloudError).code === -2 || (err as CloudError).code === -5
    }
    return false
}
