import { ref, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'

/**
 * 页面内容进入过渡
 * 每次 onShow 时触发一次轻微的淡入动画
 *
 * 使用方式:
 *   const { entered } = usePageTransition()
 *   // 模板: <view :class="{ 'page-entered': entered }">
 *   // 样式: 见下方 pageTransitionMixin
 *
 * 配合 SCSS:
 *   .page-content {
 *     opacity: 0;
 *     transition: opacity 300ms $ease-out-soft;
 *     &.page-entered {
 *       opacity: 1;
 *     }
 *   }
 */
export function usePageTransition() {
  const appStore = useAppStore()
  const entered = ref(false)

  onShow(() => {
    if (appStore.reduceMotion) {
      entered.value = true
      return
    }
    entered.value = false
    // Use setTimeout to ensure the transition triggers after initial render
    nextTick(() => {
      setTimeout(() => {
        entered.value = true
      }, 16)
    })
  })

  return { entered }
}
