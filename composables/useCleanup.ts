import { onUnmounted } from 'vue'

/**
 * Provides safe setTimeout / setInterval wrappers that auto-clear on unmount.
 *
 * Usage:
 *   const { safeTimeout, safeInterval, clearAll } = useCleanup()
 *   safeTimeout(() => { ... }, 300)
 *   safeInterval(() => { ... }, 1000)
 */
export function useCleanup() {
    const timers: ReturnType<typeof setTimeout>[] = []
    const intervals: ReturnType<typeof setInterval>[] = []

    function safeTimeout(fn: () => void, delay: number) {
        const id = setTimeout(() => {
            const idx = timers.indexOf(id)
            if (idx !== -1) timers.splice(idx, 1)
            fn()
        }, delay)
        timers.push(id)
        return id
    }

    function safeInterval(fn: () => void, delay: number) {
        const id = setInterval(fn, delay)
        intervals.push(id)
        return id
    }

    function clearAll() {
        timers.forEach(clearTimeout)
        timers.length = 0
        intervals.forEach(clearInterval)
        intervals.length = 0
    }

    onUnmounted(clearAll)

    return { safeTimeout, safeInterval, clearAll }
}
