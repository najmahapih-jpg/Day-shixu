import { getCurrentInstance, onUnmounted, ref, unref, watch, type ComputedRef, type Ref } from 'vue'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

type WindowInfoLike = {
  windowWidth?: number
  windowHeight?: number
  safeAreaInsets?: {
    bottom?: number
  }
}

export interface UseTimelineLayoutShellOptions {
  statusBarHeight: MaybeRef<number>
  viewMode: MaybeRef<'timeline' | 'calendar'>
  loading: MaybeRef<boolean>
  dayTotalCount: MaybeRef<number>
  tabbarHeightRpx: number
  timelineStatsBarRpx: number
  timelineBottomGapRpx: number
  getWindowInfo?: () => WindowInfoLike
}

const DEFAULT_SCROLL_HEIGHT = 500

/**
 * Timeline page-level layout shell for scroll height calculation.
 *
 * Owns only local layout sizing and watch-driven recalculation for
 * timeline mode, leaving initialization and business data orchestration
 * in the page owner.
 */
export function useTimelineLayoutShell(options: UseTimelineLayoutShellOptions) {
  const scrollHeight = ref(DEFAULT_SCROLL_HEIGHT)

  const getWindowInfo = options.getWindowInfo || (() => uni.getWindowInfo?.())

  function calcScrollHeight() {
    try {
      const info = getWindowInfo()
      const windowWidth = info?.windowWidth ?? 375
      const windowHeight = info?.windowHeight ?? 600
      const topOffset = unref(options.statusBarHeight) + 88 + 90
      const safeBottom = info?.safeAreaInsets?.bottom ?? 0
      const showTimelineStats =
        unref(options.viewMode) === 'timeline' &&
        !unref(options.loading) &&
        unref(options.dayTotalCount) > 0

      const timelineOverlayRpx =
        options.tabbarHeightRpx +
        options.timelineBottomGapRpx +
        (showTimelineStats ? options.timelineStatsBarRpx : 0)

      const bottomOffset = Math.round((timelineOverlayRpx * windowWidth) / 750) + safeBottom
      scrollHeight.value = windowHeight - topOffset - bottomOffset
    } catch {
      scrollHeight.value = DEFAULT_SCROLL_HEIGHT
    }
  }

  function resetLayoutShell() {
    scrollHeight.value = DEFAULT_SCROLL_HEIGHT
  }

  watch(
    [() => unref(options.viewMode), () => unref(options.loading), () => unref(options.dayTotalCount)],
    ([viewMode]) => {
      if (viewMode === 'timeline') {
        calcScrollHeight()
      }
    },
  )

  if (getCurrentInstance()) {
    onUnmounted(() => {
      resetLayoutShell()
    })
  }

  return {
    scrollHeight,
    calcScrollHeight,
    resetLayoutShell,
  }
}
