/**
 * useHaptic — 丝滑视觉微动效反馈系统（替代振动）
 *
 * 等级:
 *   light       → 微缩脉冲 (scale 0.985 → 1)
 *   medium      → 弹性脉冲 (scale 0.97 → 1.015 → 1)
 *   heavy       → 深度按压 (scale 0.95 + brightness)
 *   success     → 多段弹跳
 *   celebration → 连续弹跳 + 微旋转
 *   warning     → 水平摇摆
 *
 * 原理: 通过 ref 暴露当前 feedbackClass，页面模板绑定到根元素。
 * 所有效果均检查 reduceMotion，为 true 时跳过。
 */

import { ref, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'

// 动效持续时间映射 (ms)
const DURATION: Record<string, number> = {
  light: 180,
  medium: 280,
  heavy: 350,
  success: 450,
  celebration: 700,
  warning: 400,
}

export function useHaptic() {
  const appStore = useAppStore()

  /** 当前激活的反馈 class 名，模板中直接绑定 :class="haptic.feedbackClass" */
  const feedbackClass = ref('')

  let _timer: ReturnType<typeof setTimeout> | null = null

  function canAnimate(): boolean {
    return !appStore.reduceMotion
  }

  function applyFeedback(type: string) {
    if (!canAnimate()) return
    const ms = DURATION[type] ?? 300

    // 清除上一次未结束的反馈
    if (_timer) {
      clearTimeout(_timer)
      _timer = null
    }

    feedbackClass.value = `hf-${type}`
    _timer = setTimeout(() => {
      feedbackClass.value = ''
      _timer = null
    }, ms)
  }

  /** 轻触反馈 — 微缩脉冲 */
  function light() {
    applyFeedback('light')
  }

  /** 中等反馈 — 弹性脉冲 */
  function medium() {
    applyFeedback('medium')
  }

  /** 强烈反馈 — 深度按压 */
  function heavy() {
    applyFeedback('heavy')
  }

  /** 成功反馈 — 多段弹跳 */
  function success() {
    applyFeedback('success')
  }

  /** 庆祝反馈 — 连续弹跳 + 微旋转 */
  function celebration() {
    applyFeedback('celebration')
  }

  /** 警告反馈 — 水平摇摆 */
  function warning() {
    applyFeedback('warning')
  }

  onUnmounted(() => {
    if (_timer) {
      clearTimeout(_timer)
      _timer = null
    }
    feedbackClass.value = ''
  })

  return {
    feedbackClass,
    light,
    medium,
    heavy,
    success,
    celebration,
    warning,
  }
}
