/**
 * MotionCore — 星划动效内核 v1.0
 *
 * 统一管理全局动效参数：duration / easing / spring / depth / snap / velocity / motionLevel
 * 所有动效 composable 从此模块读取配置，确保全站动效语义一致。
 *
 * motionLevel:
 *   0 = reduced (a11y)
 *   1 = subtle  (低端机 / 省电模式)
 *   2 = full    (默认完整动效)
 */

import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

// ─── Duration Tokens ───────────────────────────────────────
export const Duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  slowest: 700,
  spring: 600,    // 弹簧动画典型时长
  reveal: 450,    // scroll reveal 进场
  flip: 300,      // FLIP 布局过渡
  carousel: 400,  // 轮播吸附
} as const

// ─── Easing Tokens ─────────────────────────────────────────
// CSS cubic-bezier strings — 用于 inline style transition
export const Easing = {
  outSoft: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  outBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  inOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  spring: 'cubic-bezier(0.34, 1.3, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  snap: 'cubic-bezier(0.2, 1, 0.3, 1)',       // 吸附用 — 快起慢落
  reveal: 'cubic-bezier(0.16, 1, 0.3, 1)',     // 进场用 — 开头极快
  bounce: 'cubic-bezier(0.34, 1.8, 0.64, 1)',  // 夸张弹跳
} as const

// ─── Spring Presets ────────────────────────────────────────
// 用于 useSpring composable 的物理参数
export interface SpringConfig {
  stiffness: number  // 刚度 (越大越硬)
  damping: number    // 阻尼 (越大越快停)
  mass: number       // 质量 (越大越慢)
}

export const SpringPresets: Record<string, SpringConfig> = {
  // 轻点回弹 — 按钮、列表项
  gentle: { stiffness: 120, damping: 14, mass: 1 },
  // 标准交互 — 卡片聚焦、磁吸
  default: { stiffness: 180, damping: 18, mass: 1 },
  // 快速吸附 — 轮播snap、滑动操作释放
  snappy: { stiffness: 300, damping: 24, mass: 1 },
  // 弹性夸张 — 成功打卡、庆祝
  bouncy: { stiffness: 200, damping: 10, mass: 0.8 },
  // 厚重惯性 — 拖拽排序、大卡片移动
  heavy: { stiffness: 100, damping: 20, mass: 2 },
} as const

// ─── Depth Tokens ──────────────────────────────────────────
// 3D 透视 & 倾斜参数
export const Depth = {
  perspective: 1000,     // 全局透视距离 (px)
  tiltMax: 8,            // 卡片最大倾斜角度 (deg)
  scalePress: 0.97,      // 按压缩放
  scaleFocus: 1.03,      // 聚焦放大
  scaleExit: 0.92,       // 退场缩小
  parallaxRatio: 0.3,    // 默认视差速差比
} as const

// ─── Snap Config ───────────────────────────────────────────
export const Snap = {
  velocityThreshold: 0.5,   // 手指释放速度阈值 (px/ms)
  distanceThreshold: 0.3,   // 滑动距离占容器比阈值
  overshootClamp: true,     // 弹簧是否限制过冲
} as const

// ─── Motion Level ──────────────────────────────────────────
export type MotionLevel = 0 | 1 | 2

/**
 * 获取当前动效等级
 * 0 = reduced (跳过所有动画)
 * 1 = subtle  (只保留 opacity 过渡)
 * 2 = full    (完整动效)
 */
export function useMotionLevel() {
  const appStore = useAppStore()

  const level = computed<MotionLevel>(() => {
    if (appStore.reduceMotion) return 0
    // 未来可接入设备性能检测，低端机返回 1
    return 2
  })

  const isReduced = computed(() => level.value === 0)
  const isSubtle = computed(() => level.value <= 1)
  const isFull = computed(() => level.value === 2)

  return { level, isReduced, isSubtle, isFull }
}

// ─── Utility: duration scaler ──────────────────────────────
/**
 * 根据 motionLevel 缩放时长
 * reduced → 0ms, subtle → 原时长*0.5, full → 原时长
 */
export function scaleDuration(base: number, motionLevel: MotionLevel): number {
  if (motionLevel === 0) return 0
  if (motionLevel === 1) return Math.round(base * 0.5)
  return base
}

// ─── Utility: clamp ────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ─── Utility: lerp ─────────────────────────────────────────
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// ─── Utility: spring solver (single step) ──────────────────
/**
 * 弹簧物理求解器 — 单步计算
 * 返回 [newValue, newVelocity]
 */
export function springStep(
  current: number,
  target: number,
  velocity: number,
  config: SpringConfig,
  dt: number = 1 / 60,
): [number, number] {
  const { stiffness, damping, mass } = config
  const displacement = current - target
  const springForce = -stiffness * displacement
  const dampingForce = -damping * velocity
  const acceleration = (springForce + dampingForce) / mass
  const newVelocity = velocity + acceleration * dt
  const newValue = current + newVelocity * dt
  return [newValue, newVelocity]
}

/**
 * 判断弹簧是否已收敛 (接近静止)
 */
export function springSettled(
  current: number,
  target: number,
  velocity: number,
  threshold: number = 0.01,
): boolean {
  return Math.abs(current - target) < threshold && Math.abs(velocity) < threshold
}
