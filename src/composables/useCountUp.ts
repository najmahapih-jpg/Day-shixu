import { ref, watch, isRef, type Ref } from 'vue'
import { useAppStore } from '@/stores/app'

/**
 * 数字从 0 跳动到目标值
 * 用于统计页面的数字展示
 *
 * @param target - 目标值，支持 Ref<number>（响应式）或普通 number
 * @param duration - 动画时长，默认 800ms
 *
 * 使用方式:
 *   const count = computed(() => store.totalCount)
 *   const { displayValue } = useCountUp(count)
 *   // 模板中: {{ displayValue }}
 */
export function useCountUp(
  target: Ref<number> | number,
  duration = 800,
) {
  const appStore = useAppStore()
  const displayValue = ref(0)
  let animTimer: ReturnType<typeof setTimeout> | null = null

  function stopAnimation() {
    if (animTimer !== null) {
      clearTimeout(animTimer)
      animTimer = null
    }
  }

  function animate(targetValue: number) {
    stopAnimation()

    if (appStore.reduceMotion) {
      displayValue.value = targetValue
      return
    }

    if (targetValue === 0) {
      displayValue.value = 0
      return
    }

    const startTime = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      displayValue.value = Math.round(eased * targetValue)
      if (progress < 1) {
        animTimer = setTimeout(tick, 16)
      }
    }
    tick()
  }

  if (isRef(target)) {
    watch(target, (newVal) => {
      animate(newVal)
    }, { immediate: true })
  } else {
    animate(target)
  }

  return { displayValue }
}
