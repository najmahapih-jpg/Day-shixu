import { ref } from 'vue'

/**
 * Page-level error boundary composable.
 *
 * Usage:
 *   const { pageError, runSafe, retry } = usePageError()
 *
 *   onLoad(async (query) => {
 *     await runSafe(() => loadPage(query))
 *   })
 *
 *   // In template:
 *   <HfEmpty v-if="pageError" type="network" actionText="重新加载" @action="retry(loadPage)" />
 */
export function usePageError() {
    const pageError = ref(false)
    let lastFn: (() => Promise<void>) | null = null

    async function runSafe(fn: () => Promise<void>) {
        pageError.value = false
        lastFn = fn
        try {
            await fn()
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') console.error('[页面初始化失败]', err)
            pageError.value = true
        }
    }

    async function retry(fn?: () => Promise<void>) {
        const target = fn || lastFn
        if (target) {
            await runSafe(target)
        }
    }

    return { pageError, runSafe, retry }
}
