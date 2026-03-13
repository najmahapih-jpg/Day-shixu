import { ref, nextTick } from 'vue'
import { useAppStore } from '@/stores/app'

interface StaggerOptions {
  /** Delay between each item in ms */
  delay?: number
  /** Animation duration in ms */
  duration?: number
  /** Translate distance (rpx) — set to '0rpx' for fade-only */
  distance?: string
}

/**
 * 列表项交错入场动画
 * 每个项目延迟 index * delay ms 后从下方滑入
 *
 * 使用方式:
 *   const { getItemStyle, triggerAnimation } = useStaggerAnimation()
 *   // 在数据加载完成后调用 triggerAnimation()
 *   // 模板中: :style="getItemStyle(idx)"
 */
export function useStaggerAnimation(options: StaggerOptions = {}) {
  const { delay = 60, duration = 300, distance = '0rpx' } = options
  const appStore = useAppStore()
  const visible = ref(false)
  const settled = ref(false)

  /**
   * 获取某个列表项的内联样式
   * 动画结束后返回空对象，不影响其他 CSS 动画（如按压反馈）
   */
  function getItemStyle(index: number): Record<string, string> {
    if (appStore.reduceMotion || settled.value) {
      return {}
    }
    return {
      opacity: visible.value ? '1' : '0',
      transform: visible.value ? 'translateY(0)' : `translateY(${distance})`,
      transition: `opacity ${duration}ms ease-out ${delay * index}ms, transform ${duration}ms ease-out ${delay * index}ms`,
    }
  }

  /**
   * 触发入场动画
   * 先重置 visible 为 false，nextTick 后设置 true，由 CSS transition 驱动
   */
  function triggerAnimation() {
    if (appStore.reduceMotion) {
      visible.value = true
      settled.value = true
      return
    }
    settled.value = false
    visible.value = false
    nextTick(() => {
      setTimeout(() => {
        visible.value = true
        // 动画结束后清除内联样式，避免与其他交互动画冲突
        setTimeout(() => {
          settled.value = true
        }, duration + delay * 20 + 200)
      }, 50)
    })
  }

  return {
    visible,
    getItemStyle,
    triggerAnimation,
  }
}
