/**
 * TTL-based Storage cache for uni-app.
 *
 * Usage:
 *   setCache('habits', habitsArray)
 *   const cached = getCache<Habit[]>('habits')
 *   clearCache('habits')  // or clearCache() to wipe all
 */

const CACHE_PREFIX = 'hf_'

const CACHE_TTL: Record<string, number> = {
    habits: 5 * 60_000,          // 5 min
    checkIns: 2 * 60_000,        // 2 min
    userInfo: 30 * 60_000,       // 30 min
    journeyPresets: 86_400_000,  // 24 h
}

const DEFAULT_TTL = 5 * 60_000 // 5 min fallback

interface CacheEntry<T = unknown> {
    data: T
    timestamp: number
}

export function setCache<T>(key: string, data: T): void {
    try {
        const entry: CacheEntry<T> = { data, timestamp: Date.now() }
        uni.setStorageSync(CACHE_PREFIX + key, JSON.stringify(entry))
    } catch {
        // Storage full or write failed — ignore silently
    }
}

export function getCache<T>(key: string): T | null {
    try {
        const raw = uni.getStorageSync(CACHE_PREFIX + key)
        if (!raw) return null

        const entry = JSON.parse(raw) as CacheEntry<T>
        const ttl = CACHE_TTL[key] ?? DEFAULT_TTL

        if (Date.now() - entry.timestamp > ttl) {
            uni.removeStorageSync(CACHE_PREFIX + key)
            return null
        }

        return entry.data
    } catch {
        return null
    }
}

export function clearCache(key?: string): void {
    try {
        if (key) {
            uni.removeStorageSync(CACHE_PREFIX + key)
            return
        }
        // Clear all hf_ prefixed keys
        const info = uni.getStorageInfoSync()
        for (const k of info.keys) {
            if (k.startsWith(CACHE_PREFIX)) {
                uni.removeStorageSync(k)
            }
        }
    } catch {
        // ignore
    }
}
