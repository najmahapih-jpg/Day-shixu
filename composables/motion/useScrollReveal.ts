import { ref, reactive, onUnmounted } from 'vue'
import { Duration, Easing } from './MotionCore'
import { useMotionLevel, scaleDuration } from './MotionCore'

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade'

export interface ScrollRevealOptions {
  direction?: RevealDirection
  distance?: number
  duration?: number
  stagger?: number
  maxStagger?: number
  scaleFrom?: number
  once?: boolean
  threshold?: number
  rootMargin?: string
}

/**
 * Batch scroll-reveal helper for list/grid style content.
 *
 * Public v1 API:
 * - getRevealStyle(index)
 * - reveal(index)
 * - revealAll(count)
 * - reset()
 * - observe(selector, instance?, startIndex?)
 */
export function useScrollReveal(options: ScrollRevealOptions = {}) {
  const {
    direction = 'up',
    distance = 40,
    duration = Duration.reveal,
    stagger = 60,
    maxStagger = 600,
    scaleFrom = 0.92,
    once = true,
    threshold = 0.1,
  } = options

  const { level } = useMotionLevel()
  const revealedSet = reactive(new Set<number>())
  let observers: any[] = []

  function getInitialTransform(): string {
    switch (direction) {
      case 'up':
        return `translateY(${distance}rpx)`
      case 'down':
        return `translateY(-${distance}rpx)`
      case 'left':
        return `translateX(${distance}rpx)`
      case 'right':
        return `translateX(-${distance}rpx)`
      case 'scale':
        return `scale(${scaleFrom})`
      case 'fade':
        return 'none'
      default:
        return `translateY(${distance}rpx)`
    }
  }

  function getRevealStyle(index: number): Record<string, string> {
    if (level.value === 0) return {}

    const isRevealed = revealedSet.has(index)
    const actualDuration = scaleDuration(duration, level.value)
    const delay = Math.min(index * stagger, maxStagger)
    const actualDelay = scaleDuration(delay, level.value)

    if (isRevealed) {
      return {
        opacity: '1',
        transform: 'translateY(0) translateX(0) scale(1)',
        transition: `opacity ${actualDuration}ms ${Easing.reveal} ${actualDelay}ms, transform ${actualDuration}ms ${Easing.reveal} ${actualDelay}ms`,
      }
    }

    return {
      opacity: '0',
      transform: getInitialTransform(),
      transition: `opacity ${actualDuration}ms ${Easing.reveal} ${actualDelay}ms, transform ${actualDuration}ms ${Easing.reveal} ${actualDelay}ms`,
    }
  }

  function reveal(index: number) {
    revealedSet.add(index)
  }

  function revealAll(count: number) {
    for (let i = 0; i < count; i += 1) {
      revealedSet.add(i)
    }
  }

  function reset() {
    revealedSet.clear()
  }

  function observe(selector: string, instance?: any, startIndex: number = 0) {
    if (level.value === 0) return

    try {
      const observer = uni.createIntersectionObserver(instance, {
        thresholds: [threshold],
        observeAll: true,
      })

      observer.relativeToViewport({ bottom: 0, top: 0 })
      observer.observe(selector, (res: any) => {
        const idx = res.dataset?.index ?? res.dataset?.revealIndex ?? startIndex
        const parsedIdx = typeof idx === 'string' ? parseInt(idx, 10) : idx

        if (res.intersectionRatio >= threshold) {
          revealedSet.add(parsedIdx)
        } else if (!once) {
          revealedSet.delete(parsedIdx)
        }
      })

      observers.push(observer)
    } catch {
      revealAll(100)
    }
  }

  onUnmounted(() => {
    observers.forEach((observer) => {
      try {
        observer.disconnect()
      } catch {
        // ignore teardown failures from platform observers
      }
    })
    observers = []
  })

  return {
    getRevealStyle,
    reveal,
    revealAll,
    reset,
    observe,
  }
}

export function useScrollRevealItem(
  selector: string,
  instance?: any,
  options: ScrollRevealOptions = {},
) {
  const { threshold = 0.1 } = options
  const { level } = useMotionLevel()
  const revealed = ref(level.value === 0)

  if (level.value === 0) {
    return { revealed }
  }

  let observer: any = null

  try {
    observer = uni.createIntersectionObserver(instance, {
      thresholds: [threshold],
    })

    observer.relativeToViewport({ bottom: 0, top: 0 })
    observer.observe(selector, (res: any) => {
      if (res.intersectionRatio >= threshold) {
        revealed.value = true
        if (options.once !== false) {
          try {
            observer?.disconnect()
          } catch {
            // ignore
          }
        }
      } else if (!options.once) {
        revealed.value = false
      }
    })
  } catch {
    revealed.value = true
  }

  onUnmounted(() => {
    try {
      observer?.disconnect()
    } catch {
      // ignore
    }
  })

  return { revealed }
}
