import { computed, unref, type ComputedRef, type Ref } from 'vue'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

type HomeJourneyPreview = {
  _id?: string
  currentStep: number
  journey?: {
    title?: string
  } | null
}

type NavigateToOptions = {
  url: string
  fail?: () => void
}

type ToastOptions = {
  title: string
  icon: 'none'
}

export interface UseHomeNavigationEntrancesOptions<TJourney extends HomeJourneyPreview> {
  isInteractionLocked: MaybeRef<boolean>
  activeJourneys: MaybeRef<TJourney[]>
  navigateTo?: (options: NavigateToOptions) => void
  showToast?: (options: ToastOptions) => void
}

function defaultNavigateTo(options: NavigateToOptions) {
  uni.navigateTo(options)
}

function defaultShowToast(options: ToastOptions) {
  uni.showToast(options)
}

/**
 * Lightweight home-page navigation entrances.
 *
 * Only owns route-target selection and lock/fail guards for home-level
 * CTA entrypoints. It must not absorb business workflows or data fetching.
 */
export function useHomeNavigationEntrances<TJourney extends HomeJourneyPreview>(
  options: UseHomeNavigationEntrancesOptions<TJourney>,
) {
  const navigateTo = options.navigateTo || defaultNavigateTo
  const showToast = options.showToast || defaultShowToast

  const activeJourney = computed<TJourney | null>(() => unref(options.activeJourneys)[0] || null)

  function isLocked() {
    return Boolean(unref(options.isInteractionLocked))
  }

  function navigateToAiInsight() {
    if (isLocked()) return
    navigateTo({ url: '/pages/sub/ai-insight/index' })
  }

  function goAiInsightPage() {
    if (isLocked()) return
    navigateTo({
      url: '/pages/sub/ai-insight/index',
      fail: () => {
        showToast({ title: '页面打开失败', icon: 'none' })
      },
    })
  }

  function startRitual(ritualId: string) {
    if (isLocked()) return
    navigateTo({
      url: `/pages/sub/ritual-execute/index?id=${ritualId}`,
    })
  }

  function goCreate() {
    if (isLocked()) return
    navigateTo({
      url: '/pages/sub/habit-create/index',
      fail: () => {
        showToast({ title: '页面打开失败', icon: 'none' })
      },
    })
  }

  function goJourneyDetail() {
    if (isLocked()) return
    if (!activeJourney.value?._id) return
    navigateTo({
      url: `/pages/sub/journey-detail/index?id=${activeJourney.value._id}`,
    })
  }

  return {
    activeJourney,
    navigateToAiInsight,
    goAiInsightPage,
    startRitual,
    goCreate,
    goJourneyDetail,
  }
}
