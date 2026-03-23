/**
 * useSwipeAction — 列表项左滑操作手势
 *
 * 用于习惯列表、设置项等需要"左滑露出操作按钮"的场景。
 * WXS 级别的跟手滑动，释放时弹簧吸附到打开/关闭状态。
 *
 * 使用方式：
 *   const swipe = useSwipeAction({ actionWidth: 160 })
 *
 *   // template:
 *   <view
 *     @touchstart="swipe.onTouchStart"
 *     @touchmove="swipe.onTouchMove"
 *     @touchend="swipe.onTouchEnd"
 *     :style="swipe.getContentStyle()"
 *   >
 *     ...内容...
 *   </view>
 *   <view class="action-buttons" :style="swipe.getActionStyle()">
 *     ...操作按钮...
 *   </view>
 */

import { ref, onUnmounted } from 'vue'
import { useSpring } from './useSpring'
import { SpringPresets, Snap } from './MotionCore'

export interface SwipeActionOptions {
  /** 操作区域宽度 rpx (默认 160) */
  actionWidth?: number
  /** 触发打开的滑动距离阈值比 (默认 0.3) */
  threshold?: number
  /** 触发打开的速度阈值 px/ms (默认 0.5) */
  velocityThreshold?: number
}

export function useSwipeAction(options: SwipeActionOptions = {}) {
  const {
    actionWidth = 160,
    threshold = Snap.distanceThreshold,
    velocityThreshold = Snap.velocityThreshold,
  } = options

  // Convert rpx to approximate px (750rpx = screen width)
  // In real runtime, this should use system info, but we use a ratio
  const actionWidthPx = actionWidth * 0.5 // rough rpx→px for 375px screen

  const isOpen = ref(false)
  const spring = useSpring(0, 'snappy', {
    bounds: [-actionWidthPx, 0],
  })

  let _startX = 0
  let _startY = 0
  let _startTime = 0
  let _isTracking = false
  let _isHorizontal: boolean | null = null

  function onTouchStart(e: any) {
    const touch = e.touches?.[0] || e.changedTouches?.[0]
    if (!touch) return

    _startX = touch.clientX || touch.pageX
    _startY = touch.clientY || touch.pageY
    _startTime = Date.now()
    _isTracking = true
    _isHorizontal = null

    spring.stop()
  }

  function onTouchMove(e: any) {
    if (!_isTracking) return
    const touch = e.touches?.[0] || e.changedTouches?.[0]
    if (!touch) return

    const x = touch.clientX || touch.pageX
    const y = touch.clientY || touch.pageY
    const dx = x - _startX
    const dy = y - _startY

    // 首次判断滑动方向
    if (_isHorizontal === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        _isHorizontal = Math.abs(dx) > Math.abs(dy)
      }
      return
    }

    if (!_isHorizontal) return

    // 阻止垂直滚动
    try { e.preventDefault?.() } catch {}

    const base = isOpen.value ? -actionWidthPx : 0
    const offset = Math.min(0, Math.max(-actionWidthPx * 1.2, base + dx))
    spring.setTarget(offset, true) // instant = 跟手
  }

  function onTouchEnd(e: any) {
    if (!_isTracking) return
    _isTracking = false

    if (_isHorizontal !== true) {
      return
    }

    const touch = e.changedTouches?.[0]
    if (!touch) return

    const x = touch.clientX || touch.pageX
    const dx = x - _startX
    const dt = Date.now() - _startTime
    const velocity = dx / Math.max(dt, 1)

    // 判断是否应该打开
    const current = spring.value.value
    const shouldOpen =
      Math.abs(velocity) > velocityThreshold
        ? velocity < 0 // 快速左滑 → 打开
        : Math.abs(current) > actionWidthPx * threshold // 超过阈值 → 打开

    if (shouldOpen) {
      isOpen.value = true
      spring.setTarget(-actionWidthPx)
    } else {
      isOpen.value = false
      spring.setTarget(0)
    }
  }

  /** 编程式关闭 */
  function close() {
    isOpen.value = false
    spring.setTarget(0)
  }

  /** 编程式打开 */
  function open() {
    isOpen.value = true
    spring.setTarget(-actionWidthPx)
  }

  function getContentStyle(): Record<string, string> {
    return {
      transform: `translateX(${spring.value.value}px)`,
      transition: spring.isAnimating.value ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)',
    }
  }

  function getActionStyle(): Record<string, string> {
    const progress = Math.abs(spring.value.value) / actionWidthPx
    return {
      opacity: String(Math.min(1, progress * 1.5)),
      transform: `translateX(${spring.value.value + actionWidthPx}px)`,
    }
  }

  return {
    isOpen,
    translateX: spring.value,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    open,
    close,
    getContentStyle,
    getActionStyle,
  }
}
