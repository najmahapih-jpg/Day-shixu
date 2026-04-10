import { ref, unref, type ComputedRef, type Ref } from 'vue'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

export interface UseTimelineScrollFeedbackOptions {
  scrollHeight: MaybeRef<number>
  startHour: number
  endHour: number
  hourHeightRpx: number
  periodLabels: Record<number, string>
  onParallaxUpdate?: (scrollTop: number) => void
  getWindowWidth?: () => number
}

function defaultGetWindowWidth() {
  try {
    const info = uni.getWindowInfo?.()
    return info?.windowWidth ?? 375
  } catch {
    return 375
  }
}

/**
 * Scroll-linked display feedback for timeline mode.
 *
 * Owns only visual feedback state derived from scroll position:
 * progress, velocity, sticky period label, and their reset behavior.
 */
export function useTimelineScrollFeedback(options: UseTimelineScrollFeedbackOptions) {
  const scrollProgress = ref(0)
  const scrollVelocity = ref(0)
  const currentPeriodLabel = ref('')

  const getWindowWidth = options.getWindowWidth || defaultGetWindowWidth
  const sortedPeriodHours = Object.keys(options.periodLabels)
    .map(Number)
    .sort((left, right) => right - left)

  function handleScroll(event: { detail?: { scrollTop?: number } }) {
    const scrollTop = event?.detail?.scrollTop ?? 0
    const windowWidth = getWindowWidth()
    const rpxRatio = windowWidth / 750

    options.onParallaxUpdate?.(scrollTop)

    const totalHeight = (options.endHour - options.startHour) * options.hourHeightRpx * rpxRatio
    scrollProgress.value = Math.min(1, scrollTop / Math.max(1, totalHeight - (unref(options.scrollHeight) || 500)))

    const currentHour = options.startHour + Math.floor(scrollTop / (options.hourHeightRpx * rpxRatio))
    const matchedHour = sortedPeriodHours.find((hour) => currentHour >= hour) ?? 0
    currentPeriodLabel.value = options.periodLabels[matchedHour] || ''

    scrollVelocity.value = scrollTop
  }

  function resetScrollFeedback() {
    scrollProgress.value = 0
    scrollVelocity.value = 0
    currentPeriodLabel.value = ''
  }

  return {
    scrollProgress,
    scrollVelocity,
    currentPeriodLabel,
    handleScroll,
    resetScrollFeedback,
  }
}
