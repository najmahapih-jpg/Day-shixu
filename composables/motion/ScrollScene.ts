/**
 * ScrollScene — 统一滚动场景管理器
 *
 * 替代各页面各自写滚动数学，统一输出：
 * - progress:       0→1 整体滚动进度
 * - velocity:       实时滚动速度 (px/ms)
 * - direction:      'up' | 'down' | 'idle'
 * - activeIndex:    基于分段高度计算的当前活动索引
 * - activeSegment:  当前活动分段名称
 * - entering:       当前正在进入视口的分段索引
 * - leaving:        当前正在离开视口的分段索引
 *
 * 设计原则：
 * - 仅在 scroll 事件中更新 raw 数据，不触发 Vue 响应式更新
 * - 通过 RAF 节流将计算结果批量同步到 ref，避免掉帧
 * - 提供 WXS 兼容的事件接口 (onScroll handler)
 *
 * 使用方式：
 *   const scene = useScrollScene({
 *     segmentHeight: 400,
 *     segmentCount: 7,
 *     segments: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
 *   })
 *   // template: @scroll="scene.onScroll"
 *   // script:   watch(scene.activeIndex, ...)
 */

import { ref, onUnmounted } from 'vue'
import { clamp } from './MotionCore'
import { safeCancelAnimationFrame, safeRequestAnimationFrame } from './rafCompat'

export type ScrollDirection = 'up' | 'down' | 'idle'

export interface ScrollSceneOptions {
  /** 每个分段的像素高度 (用于计算 activeIndex) */
  segmentHeight?: number
  /** 分段总数 */
  segmentCount?: number
  /** 分段名称列表 (可选，用于 activeSegment) */
  segments?: string[]
  /** 视口高度 (默认 800px，可动态传入) */
  viewportHeight?: number
  /** 速度平滑因子 (0-1, 越大越平滑, 默认 0.8) */
  velocitySmoothing?: number
}

export function useScrollScene(options: ScrollSceneOptions = {}) {
  const {
    segmentHeight = 400,
    segmentCount = 1,
    segments = [],
    viewportHeight = 800,
    velocitySmoothing = 0.8,
  } = options

  // ─── Reactive outputs ────────────────────────────────
  const progress = ref(0)
  const velocity = ref(0)
  const direction = ref<ScrollDirection>('idle')
  const activeIndex = ref(0)
  const activeSegment = ref(segments[0] || '')
  const entering = ref(-1)
  const leaving = ref(-1)
  const scrollTop = ref(0)

  // ─── Internal state (non-reactive for perf) ──────────
  let _prevScrollTop = 0
  let _prevTimestamp = 0
  let _rawVelocity = 0
  let _rafId = 0
  let _dirty = false

  // Raw values updated in scroll handler, synced to refs in RAF
  let _raw = {
    scrollTop: 0,
    progress: 0,
    velocity: 0,
    direction: 'idle' as ScrollDirection,
    activeIndex: 0,
    entering: -1,
    leaving: -1,
  }

  // ─── Core scroll handler ─────────────────────────────
  function onScroll(e: any) {
    const st = e.detail?.scrollTop ?? e.scrollTop ?? 0
    const now = Date.now()
    const dt = now - _prevTimestamp || 16

    // Velocity (exponential smoothing)
    const instantVelocity = (st - _prevScrollTop) / dt
    _rawVelocity = _rawVelocity * velocitySmoothing + instantVelocity * (1 - velocitySmoothing)

    // Max scroll
    const totalHeight = segmentHeight * segmentCount
    const maxScroll = Math.max(1, totalHeight - viewportHeight)

    // Progress
    _raw.progress = clamp(st / maxScroll, 0, 1)

    // Direction
    if (st > _prevScrollTop + 1) _raw.direction = 'down'
    else if (st < _prevScrollTop - 1) _raw.direction = 'up'
    // Keep previous direction if within dead zone

    // Active index (center-based)
    const centerY = st + viewportHeight / 2
    const newIndex = clamp(
      Math.floor(centerY / segmentHeight),
      0,
      segmentCount - 1,
    )

    // Entering / Leaving detection
    if (newIndex !== _raw.activeIndex) {
      _raw.entering = newIndex
      _raw.leaving = _raw.activeIndex
    }

    _raw.activeIndex = newIndex
    _raw.scrollTop = st
    _raw.velocity = _rawVelocity

    _prevScrollTop = st
    _prevTimestamp = now
    _dirty = true

    // Schedule RAF sync
    if (!_rafId) {
      _rafId = safeRequestAnimationFrame(syncToRefs)
    }
  }

  // ─── RAF sync (batch update refs) ────────────────────
  function syncToRefs() {
    _rafId = 0
    if (!_dirty) return
    _dirty = false

    scrollTop.value = _raw.scrollTop
    progress.value = _raw.progress
    velocity.value = _raw.velocity
    direction.value = _raw.direction
    activeIndex.value = _raw.activeIndex
    activeSegment.value = segments[_raw.activeIndex] || ''
    entering.value = _raw.entering
    leaving.value = _raw.leaving
  }

  // ─── Cleanup ─────────────────────────────────────────
  onUnmounted(() => {
    if (_rafId) {
      safeCancelAnimationFrame(_rafId)
      _rafId = 0
    }
  })

  // ─── Utility: get segment progress ──────────────────
  /**
   * 获取某个分段的局部进度 (0→1)
   * 例如：第 3 个分段从 scrollTop 800→1200 时，返回 0→1
   */
  function getSegmentProgress(index: number): number {
    const segStart = index * segmentHeight
    const segEnd = segStart + segmentHeight
    const center = _raw.scrollTop + viewportHeight / 2
    return clamp((center - segStart) / (segEnd - segStart), 0, 1)
  }

  /**
   * 获取某个分段相对视口中心的距离比 (-1→1)
   * 0 = 正好在视口中心, -1 = 在视口上方一屏, 1 = 在视口下方一屏
   */
  function getSegmentOffset(index: number): number {
    const itemCenter = index * segmentHeight + segmentHeight / 2
    const viewCenter = _raw.scrollTop + viewportHeight / 2
    return clamp((itemCenter - viewCenter) / (viewportHeight / 2), -1, 1)
  }

  return {
    // Reactive state
    progress,
    velocity,
    direction,
    activeIndex,
    activeSegment,
    entering,
    leaving,
    scrollTop,

    // Event handler
    onScroll,

    // Utilities
    getSegmentProgress,
    getSegmentOffset,
  }
}
