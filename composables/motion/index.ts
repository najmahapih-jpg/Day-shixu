/**
 * Motion System — Day时序动效系统统一出口
 *
 * 使用方式:
 *   import { useSpring, useScrollReveal, Duration, Easing } from '@/composables/motion'
 */

// ─── Core ──────────────────────────────────────────────────
export {
  Duration,
  Easing,
  Depth,
  Snap,
  SpringPresets,
  useMotionLevel,
  scaleDuration,
  clamp,
  lerp,
  springStep,
  springSettled,
  type SpringConfig,
  type MotionLevel,
} from './MotionCore'

// ─── ScrollScene ───────────────────────────────────────────
export {
  useScrollScene,
  type ScrollDirection,
  type ScrollSceneOptions,
} from './ScrollScene'

// ─── Composables ───────────────────────────────────────────
export {
  useScrollReveal,
  useScrollRevealItem,
  type RevealDirection,
  type ScrollRevealOptions,
} from './useScrollReveal'

export {
  useSpring,
  useSpringGroup,
  type UseSpringOptions,
} from './useSpring'

export {
  useHaptic,
} from './useHaptic'

export {
  useSwipeAction,
  type SwipeActionOptions,
} from './useSwipeAction'

export {
  useDragTilt,
  type DragTiltOptions,
} from './useDragTilt'

export {
  useSnapCarousel,
  type SnapCarouselOptions,
} from './useSnapCarousel'

export {
  useFLIP,
  useFLIPGroup,
  type FLIPOptions,
} from './useFLIP'

export {
  useParallax,
  WXS_PARALLAX_TEMPLATE,
  type ParallaxLayer,
} from './useParallax'

// ─── RAF Scheduler ─────────────────────────────────────────
export {
  getRafScheduler,
  useRafLifecycle,
  type RafCallback,
  type RafPriority,
} from './RafScheduler'
