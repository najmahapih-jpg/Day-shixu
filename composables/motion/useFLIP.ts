import { Duration, Easing } from './MotionCore'
import { useMotionLevel, scaleDuration } from './MotionCore'

export interface FLIPOptions {
  selector?: string
  duration?: number
  easing?: string
  stagger?: number
  maxItems?: number
  animateEnter?: boolean
  animateExit?: boolean
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Experimental measured FLIP helper.
 *
 * Supported v1 production path:
 * - `useFLIPGroup()` for `<transition-group>`
 *
 * Experimental path:
 * - `useFLIP().first()` + `useFLIP().lastAndPlay()`
 * - collects positions and enforces downgrade rules, but does not yet promise
 *   generic node-level playback in mini-program environments.
 */
export function useFLIP(selectorOrOptions: string | FLIPOptions = {}) {
  const opts = typeof selectorOrOptions === 'string'
    ? { selector: selectorOrOptions }
    : selectorOrOptions

  const {
    selector = '.flip-item',
    duration = Duration.flip,
    easing = Easing.spring,
    maxItems = 50,
    animateEnter = true,
  } = opts

  const { level } = useMotionLevel()

  let firstPositions = new Map<string, Rect>()
  let componentInstance: any = null

  function setInstance(instance: any) {
    componentInstance = instance
  }

  async function first(instance?: any): Promise<void> {
    firstPositions.clear()
    const inst = instance || componentInstance

    return new Promise((resolve) => {
      try {
        const query = uni.createSelectorQuery().in(inst)
        query.selectAll(selector).boundingClientRect((rects: any) => {
          if (!rects || !Array.isArray(rects)) {
            resolve()
            return
          }

          rects.forEach((rect: any, index: number) => {
            const key = rect.dataset?.flipKey || rect.id || String(index)
            firstPositions.set(key, {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            })
          })
          resolve()
        }).exec()
      } catch {
        resolve()
      }
    })
  }

  async function lastAndPlay(instance?: any): Promise<void> {
    if (level.value === 0) return

    const inst = instance || componentInstance

    if (firstPositions.size > maxItems) {
      firstPositions.clear()
      return
    }

    return new Promise((resolve) => {
      try {
        const query = uni.createSelectorQuery().in(inst)
        query.selectAll(selector).boundingClientRect((rects: any) => {
          if (!rects || !Array.isArray(rects)) {
            firstPositions.clear()
            resolve()
            return
          }

          const actualDuration = scaleDuration(duration, level.value)

          rects.forEach((rect: any, index: number) => {
            const key = rect.dataset?.flipKey || rect.id || String(index)
            const firstRect = firstPositions.get(key)

            if (!firstRect) {
              if (animateEnter) {
                applyEnterAnimation(rect, index, actualDuration)
              }
              return
            }

            const dx = firstRect.left - rect.left
            const dy = firstRect.top - rect.top

            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return

            // Mini-program node playback is still experimental.
            // Keep this measurement path available without advertising it as production-ready.
          })

          firstPositions.clear()
          resolve()
        }).exec()
      } catch {
        firstPositions.clear()
        resolve()
      }
    })
  }

  function applyEnterAnimation(_rect: any, _index: number, _duration: number) {
    // Entry animation is still delegated to template/CSS usage in v1.
  }

  function getTransitionStyle(): Record<string, string> {
    const actualDuration = scaleDuration(duration, level.value)
    return {
      transition: `transform ${actualDuration}ms ${easing}, opacity ${actualDuration}ms ease`,
      willChange: 'transform, opacity',
    }
  }

  function getMoveClass(): string {
    return 'flip-move'
  }

  function getMoveCss(): string {
    const actualDuration = scaleDuration(duration, level.value)
    return `.flip-move { transition: transform ${actualDuration}ms ${easing}; }`
  }

  return {
    setInstance,
    first,
    lastAndPlay,
    getTransitionStyle,
    getMoveClass,
    getMoveCss,
  }
}

export function useFLIPGroup(options: FLIPOptions = {}) {
  const {
    duration = Duration.flip,
    easing = Easing.spring,
  } = options

  const { level } = useMotionLevel()

  const enterActiveClass = 'flip-enter-active'
  const leaveActiveClass = 'flip-leave-active'
  const moveClass = 'flip-move'

  function getCss(): string {
    const actualDuration = scaleDuration(duration, level.value)
    return `
      .flip-move {
        transition: transform ${actualDuration}ms ${easing};
      }
      .flip-enter-active {
        transition: opacity ${actualDuration}ms ease, transform ${actualDuration}ms ${easing};
      }
      .flip-leave-active {
        transition: opacity ${actualDuration * 0.6}ms ease, transform ${actualDuration * 0.6}ms ease;
        position: absolute !important;
      }
      .flip-enter-from {
        opacity: 0;
        transform: scale(0.92) translateY(20rpx);
      }
      .flip-leave-to {
        opacity: 0;
        transform: scale(0.92);
      }
    `
  }

  return {
    enterActiveClass,
    leaveActiveClass,
    moveClass,
    getCss,
  }
}
