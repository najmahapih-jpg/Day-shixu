import { ref } from 'vue'

/**
 * 通用加载状态管理
 *
 * 使用方式:
 *   const { loading, error, withLoading } = useLoading()
 *   await withLoading(async () => { ... })
 *   // 模板中: v-if="loading"
 */
export function useLoading() {
  const loading = ref(true)
  const error = ref<string | null>(null)

  /**
   * 包裹异步操作，自动管理 loading / error 状态
   * 出错时自动弹出 toast 提示
   */
  async function withLoading<T>(fn: () => Promise<T>): Promise<T | undefined> {
    loading.value = true
    error.value = null
    try {
      const result = await fn()
      return result
    } catch (err: any) {
      error.value = err.message || '加载失败'
      uni.showToast({ title: error.value!, icon: 'none' })
    } finally {
      loading.value = false
    }
  }

  return { loading, error, withLoading }
}
