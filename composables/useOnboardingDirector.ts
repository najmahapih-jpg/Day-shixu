import { computed, onUnmounted, ref, watch } from 'vue'
import { clamp, useSpring } from '@/composables/motion'
import { useAppStore } from '@/stores/app'
import { PUBLIC_COPY, type PublicOnboardingSceneCopy } from '@/utils/publicCopy'

export type OnboardingPhase = 'idle' | 'dragging' | 'snapping' | 'settling' | 'launching'

export interface OnboardingSceneLayer {
  id: string
  role: 'background' | 'hero' | 'title' | 'content' | 'decor' | 'cta'
  depth: number
}

export interface OnboardingScene {
  id: string
  chapterTag: string
  accent: string
  accentSoft: string
  bgGradient: string
  eyebrow: string
  phaseLabel: string
  titleLines: [string, string]
  desc: string
  cta: string
  heroBadges?: [string, string]
  brandSignature?: string
  previewMeta?: string
  previewTitle?: string
  previewDesc?: string
  illustration?: string
  layers: OnboardingSceneLayer[]
  enterScript: string[]
  exitScript: string[]
  hapticPoints: number[]
}

type ReactiveBoolean = boolean | { value: boolean }

export interface UseOnboardingDirectorOptions {
  reduceMotion?: ReactiveBoolean
}

const HAS_ONBOARDED_KEY = 'hasOnboarded'
const HOME_URL = '/pages/index/index'
const GESTURE_LOCK_DISTANCE_PX = 10
const GESTURE_AXIS_BIAS_PX = 6
const ONBOARDING_SNAP_VELOCITY_THRESHOLD = 0.42
const ONBOARDING_SNAP_DISTANCE_THRESHOLD = 0.24
const ONBOARDING_SCENE_COPY = Object.fromEntries(
  PUBLIC_COPY.onboarding.scenes.map(scene => [scene.id, scene]),
) as Record<PublicOnboardingSceneCopy['id'], PublicOnboardingSceneCopy>

export const DEFAULT_ONBOARDING_SCENES: OnboardingScene[] = [
  {
    id: 'habit',
    ...ONBOARDING_SCENE_COPY.habit,
    accent: '#E8725C',
    accentSoft: 'rgba(232,114,92,0.16)',
    bgGradient: 'linear-gradient(180deg, #FFF6F1 0%, #FAF8F5 62%, #F5F0EB 100%)',
    illustration: 'onboarding/habit.svg',
    layers: [
      { id: 'habit-bg', role: 'background', depth: 0.1 },
      { id: 'habit-hero', role: 'hero', depth: 0.52 },
      { id: 'habit-title', role: 'title', depth: 0.66 },
      { id: 'habit-copy', role: 'content', depth: 0.78 },
    ],
    enterScript: ['index-sync', 'hero-slide', 'title-clip'],
    exitScript: ['index-pull', 'hero-drift', 'copy-fade'],
    hapticPoints: [0, 0.5, 1],
  },
  {
    id: 'ritual',
    ...ONBOARDING_SCENE_COPY.ritual,
    accent: '#F5C563',
    accentSoft: 'rgba(245,197,99,0.18)',
    bgGradient: 'linear-gradient(180deg, #FFFBEF 0%, #FAF8F5 58%, #F1ECE3 100%)',
    illustration: 'onboarding/ritual.svg',
    layers: [
      { id: 'ritual-bg', role: 'background', depth: 0.1 },
      { id: 'ritual-orbit', role: 'hero', depth: 0.48 },
      { id: 'ritual-title', role: 'title', depth: 0.7 },
      { id: 'ritual-copy', role: 'content', depth: 0.82 },
    ],
    enterScript: ['orbit-rise', 'node-focus', 'ring-breathe'],
    exitScript: ['orbit-sweep', 'node-fade', 'copy-slide'],
    hapticPoints: [1, 1.38, 1.72],
  },
  {
    id: 'journey',
    ...ONBOARDING_SCENE_COPY.journey,
    accent: '#8BA888',
    accentSoft: 'rgba(139,168,136,0.18)',
    bgGradient: 'linear-gradient(180deg, #F3F8F1 0%, #FAF8F5 58%, #ECEEE7 100%)',
    illustration: 'onboarding/journey.svg',
    layers: [
      { id: 'journey-bg', role: 'background', depth: 0.1 },
      { id: 'journey-stack', role: 'hero', depth: 0.44 },
      { id: 'journey-title', role: 'title', depth: 0.68 },
      { id: 'journey-copy', role: 'content', depth: 0.82 },
    ],
    enterScript: ['deck-rise', 'focus-shift', 'timeline-draw'],
    exitScript: ['deck-collapse', 'future-pull', 'copy-fade'],
    hapticPoints: [2, 2.34, 2.68],
  },
  {
    id: 'launch',
    ...ONBOARDING_SCENE_COPY.launch,
    accent: '#7EB8C9',
    accentSoft: 'rgba(126,184,201,0.18)',
    bgGradient: 'linear-gradient(180deg, #F1FAFC 0%, #FAF8F5 54%, #EDF1F4 100%)',
    layers: [
      { id: 'launch-bg', role: 'background', depth: 0.1 },
      { id: 'launch-home', role: 'hero', depth: 0.42 },
      { id: 'launch-title', role: 'title', depth: 0.68 },
      { id: 'launch-copy', role: 'content', depth: 0.82 },
      { id: 'launch-cta', role: 'cta', depth: 0.94 },
    ],
    enterScript: ['token-gather', 'preview-rise', 'cta-lock'],
    exitScript: ['launch-burst'],
    hapticPoints: [3, 3.33, 3.8],
  },
]

function getViewportWidth(): number {
  try {
    const info = uni.getWindowInfo()
    return info.windowWidth || 375
  } catch {
    return 375
  }
}

export function useOnboardingDirector(
  customScenes: OnboardingScene[] = DEFAULT_ONBOARDING_SCENES,
  options: UseOnboardingDirectorOptions = {},
) {
  const appStore = useAppStore()
  const scenes = customScenes
  const maxIndex = Math.max(scenes.length - 1, 0)

  const progressSpring = useSpring(0, 'snappy', {
    bounds: [0, maxIndex],
    restThreshold: 0.001,
    clampOvershoot: true,
  })

  const phase = ref<OnboardingPhase>('idle')
  const sceneProgress = computed(() => progressSpring.value.value)
  const activeIndex = computed(() => clamp(Math.round(sceneProgress.value), 0, maxIndex))
  const currentScene = computed(() => scenes[activeIndex.value] || scenes[0])
  const progressPercent = computed(() => (maxIndex <= 0 ? 1 : sceneProgress.value / maxIndex))
  const canSkip = computed(() => activeIndex.value < maxIndex && phase.value !== 'launching')

  const snapIndex = ref(0)

  let startX = 0
  let startY = 0
  let startProgress = 0
  let startAt = 0
  let startIndex = 0
  let horizontalGesture: boolean | null = null
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  let launchTimer: ReturnType<typeof setTimeout> | null = null

  function prefersReducedMotion() {
    if (typeof options.reduceMotion === 'boolean') {
      return options.reduceMotion
    }
    if (options.reduceMotion && typeof options.reduceMotion === 'object') {
      return !!options.reduceMotion.value
    }
    return appStore.reduceMotion
  }

  function clearSettleTimer() {
    if (settleTimer) {
      clearTimeout(settleTimer)
      settleTimer = null
    }
  }

  function clearLaunchTimer() {
    if (launchTimer) {
      clearTimeout(launchTimer)
      launchTimer = null
    }
  }

  function scheduleIdleState() {
    clearSettleTimer()
    settleTimer = setTimeout(() => {
      if (phase.value !== 'launching') {
        phase.value = 'idle'
      }
    }, prefersReducedMotion() ? 0 : 90)
  }

  watch(
    () => progressSpring.isAnimating.value,
    (isAnimating) => {
      if (phase.value === 'dragging' || phase.value === 'launching') return
      if (!isAnimating) {
        snapIndex.value = activeIndex.value
        phase.value = phase.value === 'idle' ? 'idle' : 'settling'
        scheduleIdleState()
      }
    },
    { immediate: true },
  )

  function snapTo(index: number, animate = true) {
    const target = clamp(index, 0, maxIndex)
    snapIndex.value = target

    if (!animate || prefersReducedMotion()) {
      phase.value = 'settling'
      progressSpring.reset(target)
      scheduleIdleState()
      return
    }

    phase.value = 'snapping'
    progressSpring.setTarget(target)
  }

  function markCompletionRuntime() {
    try {
      const app = getApp() as
        | {
            __hfOnboardingCompleted?: boolean
            globalData?: Record<string, unknown>
          }
        | undefined

      if (!app) return
      app.__hfOnboardingCompleted = true
      if (app.globalData && typeof app.globalData === 'object') {
        app.globalData.__hfOnboardingCompleted = true
      }
    } catch {
      // Ignore runtime state issues and continue into the app.
    }
  }

  function persistCompletion() {
    markCompletionRuntime()
    try {
      uni.setStorageSync(HAS_ONBOARDED_KEY, 'true')
    } catch {
      // Ignore storage issues and continue into the app.
    }
  }

  function reLaunchHome() {
    uni.reLaunch({ url: HOME_URL })
  }

  function complete(immediate = false) {
    if (phase.value === 'launching') return

    if (immediate || prefersReducedMotion()) {
      persistCompletion()
      reLaunchHome()
      return
    }

    phase.value = 'launching'
    clearLaunchTimer()
    launchTimer = setTimeout(() => {
      persistCompletion()
      reLaunchHome()
    }, 520)
  }

  function goNext() {
    if (activeIndex.value >= maxIndex) {
      complete()
      return
    }
    snapTo(activeIndex.value + 1)
  }

  function goPrev() {
    if (activeIndex.value <= 0) {
      snapTo(0)
      return
    }
    snapTo(activeIndex.value - 1)
  }

  function onTouchStart(event: any) {
    if (phase.value === 'launching') return
    const touch = event.touches?.[0]
    if (!touch) return

    clearSettleTimer()
    progressSpring.stop()

    startX = touch.clientX || touch.pageX || 0
    startY = touch.clientY || touch.pageY || 0
    startProgress = sceneProgress.value
    startAt = Date.now()
    startIndex = snapIndex.value
    horizontalGesture = null
  }

  function onTouchMove(event: any) {
    if (phase.value === 'launching') return
    const touch = event.touches?.[0]
    if (!touch) return

    const x = touch.clientX || touch.pageX || 0
    const y = touch.clientY || touch.pageY || 0
    const dx = x - startX
    const dy = y - startY

    if (horizontalGesture === null) {
      if (Math.abs(dx) < GESTURE_LOCK_DISTANCE_PX && Math.abs(dy) < GESTURE_LOCK_DISTANCE_PX) return
      if (Math.abs(dx) > Math.abs(dy) + GESTURE_AXIS_BIAS_PX) {
        horizontalGesture = true
      } else if (Math.abs(dy) > Math.abs(dx) + GESTURE_AXIS_BIAS_PX) {
        horizontalGesture = false
        return
      } else {
        return
      }
      phase.value = 'dragging'
    }

    if (!horizontalGesture) return

    try {
      event.preventDefault?.()
    } catch {
      // noop
    }

    const nextProgress = clamp(startProgress - dx / getViewportWidth(), 0, maxIndex)
    progressSpring.setTarget(nextProgress, true)
  }

  function resolveSnapTarget(baseIndex: number, deltaProgress: number, deltaX: number, elapsed: number) {
    let target = baseIndex
    const velocityPx = deltaX / Math.max(elapsed, 1)

    if (Math.abs(velocityPx) > ONBOARDING_SNAP_VELOCITY_THRESHOLD) {
      target += deltaX < 0 ? 1 : -1
    } else if (Math.abs(deltaProgress) > ONBOARDING_SNAP_DISTANCE_THRESHOLD) {
      target += deltaProgress > 0 ? 1 : -1
    }

    return clamp(target, 0, maxIndex)
  }

  function onTouchEnd(event: any) {
    if (phase.value === 'launching') return

    const touch = event.changedTouches?.[0]
    if (!touch) {
      snapTo(activeIndex.value)
      return
    }

    if (horizontalGesture !== true) {
      horizontalGesture = null
      return
    }

    const endX = touch.clientX || touch.pageX || 0
    const deltaX = endX - startX
    const deltaProgress = -deltaX / getViewportWidth()
    const elapsed = Date.now() - startAt
    const target = resolveSnapTarget(startIndex, deltaProgress, deltaX, elapsed)

    horizontalGesture = null
    snapTo(target)
  }

  function onTouchCancel() {
    if (phase.value === 'launching') return
    horizontalGesture = null
    snapTo(activeIndex.value)
  }

  onUnmounted(() => {
    clearSettleTimer()
    clearLaunchTimer()
    progressSpring.stop()
  })

  return {
    scenes,
    phase,
    sceneProgress,
    activeIndex,
    currentScene,
    progressPercent,
    canSkip,
    snapTo,
    goNext,
    goPrev,
    complete,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  }
}
