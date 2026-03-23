/**
 * useSnapCarousel — 磁吸式轮播手势
 *
 * 带速度感知的吸附滑动，释放时弹簧吸附到最近的 item。
 * 支持水平/垂直方向，滑动时相邻项做透视缩放。
 *
 * 使用方式：
 *   const carousel = useSnapCarousel({
 *     itemWidth: 200,
 *     itemCount: 7,
 *     gap: 16,
 *   })
 *
 *   <view
 *     @touchstart="carousel.onTouchStart"
 *     @touchmove="carousel.onTouchMove"
 *     @touchend="carousel.onTouchEnd"
 *   >
 *     <view
 *       v-for="(item, i) in items"
 *       :style="carousel.getItemStyle(i)"
 *     >
 */

import { ref, computed, onUnmounted } from 'vue'
import { useSpring } from './useSpring'
import { Depth, Easing, Snap, SpringPresets } from './MotionCore'
import { useMotionLevel, clamp } from './MotionCore'

export interface SnapCarouselOptions {
  /** 每个 item 的宽度 px */
  itemWidth: number
  /** item 总数 */
  itemCount: number
  /** item 间距 px (默认 0) */
  gap?: number
  /** 方向 (默认 'horizontal') */
  direction?: 'horizontal' | 'vertical'
  /** 初始聚焦索引 (默认 0) */
  initialIndex?: number
  /** 是否循环 (默认 false) */
  loop?: boolean
  /** 聚焦项的缩放 (默认 1) */
  focusScale?: number
  /** 非聚焦项的缩放 (默认 0.85) */
  unfocusScale?: number
  /** 非聚焦项的透明度 (默认 0.6) */
  unfocusOpacity?: number
}

export function useSnapCarousel(options: SnapCarouselOptions) {
  const {
    itemWidth,
    itemCount,
    gap = 0,
    direction = 'horizontal',
    initialIndex = 0,
    loop = false,
    focusScale = 1,
    unfocusScale = 0.85,
    unfocusOpacity = 0.6,
  } = options

  const { level } = useMotionLevel()
  const step = itemWidth + gap
  const maxOffset = -(itemCount - 1) * step

  const activeIndex = ref(initialIndex)
  const spring = useSpring(-initialIndex * step, 'snappy', {
    bounds: loop ? undefined : [maxOffset, 0],
  })

  let _startPos = 0
  let _startTime = 0
  let _isTracking = false
  let _isDirectional: boolean | null = null
  let _startX = 0
  let _startY = 0

  function onTouchStart(e: any) {
    const touch = e.touches?.[0]
    if (!touch) return

    _startX = touch.clientX || touch.pageX
    _startY = touch.clientY || touch.pageY
    _startPos = direction === 'horizontal' ? _startX : _startY
    _startTime = Date.now()
    _isTracking = true
    _isDirectional = null

    spring.stop()
  }

  function onTouchMove(e: any) {
    if (!_isTracking) return
    const touch = e.touches?.[0]
    if (!touch) return

    const x = touch.clientX || touch.pageX
    const y = touch.clientY || touch.pageY
    const dx = x - _startX
    const dy = y - _startY

    // 方向锁定
    if (_isDirectional === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        _isDirectional = direction === 'horizontal'
          ? Math.abs(dx) > Math.abs(dy)
          : Math.abs(dy) > Math.abs(dx)
      }
      return
    }

    if (!_isDirectional) return
    try { e.preventDefault?.() } catch {}

    const currentPos = direction === 'horizontal' ? x : y
    const delta = currentPos - _startPos
    const base = -activeIndex.value * step
    spring.setTarget(base + delta, true)
  }

  function onTouchEnd(e: any) {
    if (!_isTracking) return
    _isTracking = false
    if (_isDirectional !== true) return

    const touch = e.changedTouches?.[0]
    if (!touch) return

    const endPos = direction === 'horizontal'
      ? (touch.clientX || touch.pageX)
      : (touch.clientY || touch.pageY)
    const delta = endPos - _startPos
    const dt = Date.now() - _startTime
    const velocity = delta / Math.max(dt, 1)

    // 确定目标 index
    let targetIndex = activeIndex.value

    if (Math.abs(velocity) > Snap.velocityThreshold) {
      // 快速滑动: 按速度方向切换
      targetIndex += velocity < 0 ? 1 : -1
    } else if (Math.abs(delta) > step * Snap.distanceThreshold) {
      // 慢速但超过阈值: 按距离方向切换
      targetIndex += delta < 0 ? 1 : -1
    }

    // Clamp
    if (!loop) {
      targetIndex = clamp(targetIndex, 0, itemCount - 1)
    } else {
      targetIndex = ((targetIndex % itemCount) + itemCount) % itemCount
    }

    activeIndex.value = targetIndex
    spring.setTargetWithVelocity(-targetIndex * step, velocity * 0.5)
  }

  /** 编程式跳转 */
  function goTo(index: number, animate = true) {
    const target = clamp(index, 0, itemCount - 1)
    activeIndex.value = target
    if (animate && level.value > 0) {
      spring.setTarget(-target * step)
    } else {
      spring.reset(-target * step)
    }
  }

  function next() {
    goTo(activeIndex.value + 1)
  }

  function prev() {
    goTo(activeIndex.value - 1)
  }

  /**
   * 获取每个 item 的变换样式
   * 基于当前 spring offset 计算缩放和透明度
   */
  function getItemStyle(index: number): Record<string, string> {
    const offset = spring.value.value
    const itemCenter = index * step + itemWidth / 2
    const viewCenter = -offset + itemWidth / 2 // 假设容器从 0 开始
    const dist = Math.abs(itemCenter - viewCenter) / step

    const s = level.value === 0
      ? focusScale
      : focusScale - (focusScale - unfocusScale) * clamp(dist, 0, 1)
    const o = level.value === 0
      ? 1
      : 1 - (1 - unfocusOpacity) * clamp(dist, 0, 1)

    const translateProp = direction === 'horizontal' ? 'translateX' : 'translateY'
    const pos = index * step + offset

    return {
      transform: `${translateProp}(${pos}px) scale(${s.toFixed(3)})`,
      opacity: o.toFixed(2),
      transition: spring.isAnimating.value ? 'none' : `transform 0.3s ${Easing.snap}, opacity 0.3s ease`,
      willChange: 'transform, opacity',
    }
  }

  return {
    activeIndex,
    offset: spring.value,
    isAnimating: spring.isAnimating,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    goTo,
    next,
    prev,
    getItemStyle,
  }
}
