/**
 * useSpring — 弹簧物理动画引擎
 *
 * 基于 MotionCore 的弹簧求解器，提供：
 * - 单值弹簧动画 (数字从当前值弹向目标值)
 * - 多值弹簧动画 (x, y, scale, rotation 等同时弹)
 * - 跟手拖拽 + 释放回弹
 * - 惯性吸附 (给定初速度 + 目标点)
 *
 * 使用方式：
 *   // 单值
 *   const { value, setTarget, stop } = useSpring(0, SpringPresets.default)
 *   setTarget(100) // 弹向 100
 *
 *   // 用于 style
 *   :style="{ transform: `translateX(${value}px)` }"
 *
 *   // 跟手
 *   setTarget(touchX, true) // instant=true 立即跟随
 *   // 释放
 *   setTarget(snapPoint) // 弹向吸附点
 */

import { ref, onUnmounted, type Ref } from 'vue'
import {
  type SpringConfig,
  SpringPresets,
  springStep,
  springSettled,
} from './MotionCore'
import { useMotionLevel } from './MotionCore'
import { safeCancelAnimationFrame, safeRequestAnimationFrame } from './rafCompat'

export interface UseSpringOptions {
  /** 弹簧配置 (默认 SpringPresets.default) */
  config?: SpringConfig
  /** 收敛阈值 (默认 0.5 — 像素级精度) */
  restThreshold?: number
  /** 是否限制过冲 (默认 false) */
  clampOvershoot?: boolean
  /** 值范围限制 [min, max] */
  bounds?: [number, number]
}

export function useSpring(
  initialValue: number = 0,
  configOrPreset: SpringConfig | keyof typeof SpringPresets = 'default',
  options: UseSpringOptions = {},
) {
  const config = typeof configOrPreset === 'string'
    ? SpringPresets[configOrPreset]
    : configOrPreset

  const {
    restThreshold = 0.5,
    clampOvershoot = false,
    bounds,
  } = options

  const { level } = useMotionLevel()

  const value = ref(initialValue)
  const isAnimating = ref(false)

  let _current = initialValue
  let _target = initialValue
  let _velocity = 0
  let _rafId = 0
  let _lastTime = 0

  function clampValue(v: number): number {
    if (!bounds) return v
    return Math.min(Math.max(v, bounds[0]), bounds[1])
  }

  function tick() {
    const now = Date.now()
    const dt = Math.min((now - _lastTime) / 1000, 0.064) // cap at ~15fps min
    _lastTime = now

    const [newVal, newVel] = springStep(_current, _target, _velocity, config, dt)

    _current = clampOvershoot
      ? (_velocity > 0 ? Math.min(newVal, _target) : Math.max(newVal, _target))
      : newVal
    _velocity = newVel

    if (bounds) {
      _current = clampValue(_current)
    }

    value.value = Math.round(_current * 100) / 100 // 2 decimal precision

    if (springSettled(_current, _target, _velocity, restThreshold)) {
      _current = _target
      _velocity = 0
      value.value = _target
      isAnimating.value = false
      _rafId = 0
      return
    }

    _rafId = safeRequestAnimationFrame(tick)
  }

  /**
   * 设置弹簧目标值
   * @param target 目标值
   * @param instant 是否立即到达 (不做弹簧动画，用于跟手)
   */
  function setTarget(target: number, instant: boolean = false) {
    _target = bounds ? clampValue(target) : target

    if (level.value === 0 || instant) {
      _current = _target
      _velocity = 0
      value.value = _target
      isAnimating.value = false
      if (_rafId) {
        safeCancelAnimationFrame(_rafId)
        _rafId = 0
      }
      return
    }

    if (!isAnimating.value) {
      isAnimating.value = true
      _lastTime = Date.now()
      _rafId = safeRequestAnimationFrame(tick)
    }
  }

  /**
   * 设置弹簧目标值，并给定初速度 (用于惯性吸附)
   */
  function setTargetWithVelocity(target: number, initialVelocity: number) {
    _target = bounds ? clampValue(target) : target
    _velocity = initialVelocity

    if (level.value === 0) {
      _current = _target
      _velocity = 0
      value.value = _target
      return
    }

    if (!isAnimating.value) {
      isAnimating.value = true
      _lastTime = Date.now()
      _rafId = safeRequestAnimationFrame(tick)
    }
  }

  /**
   * 立即停止动画
   */
  function stop() {
    if (_rafId) {
      safeCancelAnimationFrame(_rafId)
      _rafId = 0
    }
    _velocity = 0
    isAnimating.value = false
  }

  /**
   * 重置到指定值
   */
  function reset(newValue: number = initialValue) {
    stop()
    _current = newValue
    _target = newValue
    value.value = newValue
  }

  onUnmounted(() => {
    stop()
  })

  return {
    value,
    isAnimating,
    setTarget,
    setTargetWithVelocity,
    stop,
    reset,
  }
}

/**
 * 多维弹簧 — 同时驱动 x, y, scale, rotation 等
 * 返回一个响应式对象，每个 key 独立弹簧
 */
export function useSpringGroup<K extends string>(
  keys: K[],
  initialValues: Record<K, number>,
  configOrPreset: SpringConfig | keyof typeof SpringPresets = 'default',
  options: UseSpringOptions = {},
) {
  const springs = {} as Record<K, ReturnType<typeof useSpring>>
  const values = {} as Record<K, Ref<number>>

  for (const key of keys) {
    const s = useSpring(initialValues[key] ?? 0, configOrPreset, options)
    springs[key] = s
    values[key] = s.value
  }

  function setTargets(targets: Partial<Record<K, number>>, instant = false) {
    for (const key of keys) {
      if (targets[key] !== undefined) {
        springs[key].setTarget(targets[key]!, instant)
      }
    }
  }

  function resetAll() {
    for (const key of keys) {
      springs[key].reset()
    }
  }

  function stopAll() {
    for (const key of keys) {
      springs[key].stop()
    }
  }

  return {
    springs,
    values,
    setTargets,
    resetAll,
    stopAll,
  }
}
