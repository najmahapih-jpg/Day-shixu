/**
 * useDragTilt — 3D 卡片倾斜触感
 *
 * 手指按压时根据触点位置计算 rotateX/Y，营造实体卡片的触感。
 * 松手后弹簧回弹到水平状态。
 *
 * 使用方式：
 *   const tilt = useDragTilt({ maxAngle: 8 })
 *
 *   <view
 *     @touchstart="tilt.onTouchStart"
 *     @touchmove="tilt.onTouchMove"
 *     @touchend="tilt.onTouchEnd"
 *     :style="tilt.style.value"
 *   >
 */

import { ref, computed, onUnmounted } from 'vue'
import { useSpring } from './useSpring'
import { Depth, SpringPresets } from './MotionCore'
import { useMotionLevel } from './MotionCore'

export interface DragTiltOptions {
  /** 最大倾斜角度 deg (默认 Depth.tiltMax = 8) */
  maxAngle?: number
  /** 按压时的缩放 (默认 Depth.scalePress = 0.97) */
  scaleOnPress?: number
  /** 元素宽度 px (用于计算倾斜比例, 默认自动获取) */
  width?: number
  /** 元素高度 px */
  height?: number
  /** 透视距离 px (默认 Depth.perspective = 1000) */
  perspective?: number
}

export function useDragTilt(options: DragTiltOptions = {}) {
  const {
    maxAngle = Depth.tiltMax,
    scaleOnPress = Depth.scalePress,
    perspective = Depth.perspective,
  } = options

  const { level } = useMotionLevel()
  const rotateX = useSpring(0, 'gentle')
  const rotateY = useSpring(0, 'gentle')
  const scale = useSpring(1, 'gentle')
  const isPressed = ref(false)

  let _elementWidth = options.width || 300
  let _elementHeight = options.height || 200
  let _elementRect = { left: 0, top: 0 }

  function onTouchStart(e: any) {
    if (level.value === 0) return

    const touch = e.touches?.[0]
    if (!touch) return

    isPressed.value = true
    scale.setTarget(scaleOnPress)

    // 尝试获取元素尺寸 (仅在提供了 width/height 或首次触摸时)
    updateTilt(touch)
  }

  function onTouchMove(e: any) {
    if (!isPressed.value || level.value === 0) return

    const touch = e.touches?.[0]
    if (!touch) return

    updateTilt(touch)
  }

  function updateTilt(touch: any) {
    const x = (touch.clientX || touch.pageX) - _elementRect.left
    const y = (touch.clientY || touch.pageY) - _elementRect.top

    // 归一化到 -1 ~ 1
    const normalizedX = (x / _elementWidth - 0.5) * 2
    const normalizedY = (y / _elementHeight - 0.5) * 2

    // rotateY 跟随 X 轴, rotateX 反向跟随 Y 轴 (模拟物理)
    rotateY.setTarget(normalizedX * maxAngle, true) // instant 跟手
    rotateX.setTarget(-normalizedY * maxAngle, true)
  }

  function onTouchEnd() {
    isPressed.value = false
    rotateX.setTarget(0)
    rotateY.setTarget(0)
    scale.setTarget(1)
  }

  /**
   * 设置元素的 rect 信息 (用于精确计算倾斜)
   * 在 onMounted 中使用 uni.createSelectorQuery 获取后调用
   */
  function setElementRect(rect: { left: number; top: number; width: number; height: number }) {
    _elementRect = { left: rect.left, top: rect.top }
    _elementWidth = rect.width
    _elementHeight = rect.height
  }

  const style = computed(() => {
    if (level.value === 0) return {}
    return {
      transform: `perspective(${perspective}px) rotateX(${rotateX.value.value}deg) rotateY(${rotateY.value.value}deg) scale(${scale.value.value})`,
      transition: isPressed.value ? 'none' : `transform 0.4s cubic-bezier(0.34, 1.3, 0.64, 1)`,
      willChange: 'transform',
    }
  })

  return {
    style,
    isPressed,
    rotateX: rotateX.value,
    rotateY: rotateY.value,
    scale: scale.value,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    setElementRect,
  }
}
