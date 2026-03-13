import { ref } from 'vue'

/**
 * 操作锁 composable — 防止快速连点
 *
 * 使用方式:
 *   const { locked, withLock } = useActionLock()
 *   async function onTap() {
 *     await withLock(async () => {
 *       await doSomething()
 *     })
 *   }
 *
 * @param delayMs 操作完成后额外锁定时间（默认 300ms），防止动画期间再次触发
 */
export function useActionLock(delayMs = 300) {
    const locked = ref(false)

    async function withLock<T>(fn: () => Promise<T>): Promise<T | undefined> {
        if (locked.value) return
        locked.value = true
        try {
            return await fn()
        } finally {
            setTimeout(() => {
                locked.value = false
            }, delayMs)
        }
    }

    return { locked, withLock }
}
