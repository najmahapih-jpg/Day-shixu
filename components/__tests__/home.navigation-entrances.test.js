const { computed, ref } = require('vue')
const { useHomeNavigationEntrances } = require('@/composables/useHomeNavigationEntrances')

function createJourney(overrides = {}) {
  return {
    _id: 'journey-1',
    currentStep: 1,
    journey: { title: '晨间重启' },
    ...overrides,
  }
}

describe('useHomeNavigationEntrances', () => {
  test('exposes the first active journey and routes lightweight navigation entrances', () => {
    const navigateTo = jest.fn()
    const entrances = useHomeNavigationEntrances({
      isInteractionLocked: ref(false),
      activeJourneys: ref([
        createJourney({ _id: 'journey-1' }),
        createJourney({ _id: 'journey-2' }),
      ]),
      navigateTo,
      showToast: jest.fn(),
    })

    expect(entrances.activeJourney.value._id).toBe('journey-1')

    entrances.goJourneyDetail()
    entrances.goCreate()
    entrances.startRitual('ritual-9')
    entrances.navigateToAiInsight()

    expect(navigateTo.mock.calls).toEqual([
      [{ url: '/pages/sub/journey-detail/index?id=journey-1' }],
      [{ url: '/pages/sub/habit-create/index', fail: expect.any(Function) }],
      [{ url: '/pages/sub/ritual-execute/index?id=ritual-9' }],
      [{ url: '/pages/sub/ai-insight/index' }],
    ])
  })

  test('blocks navigation when interaction is locked or active journey is absent', () => {
    const navigateTo = jest.fn()
    const locked = ref(true)
    const entrances = useHomeNavigationEntrances({
      isInteractionLocked: computed(() => locked.value),
      activeJourneys: ref([]),
      navigateTo,
      showToast: jest.fn(),
    })

    entrances.goJourneyDetail()
    entrances.goCreate()
    entrances.goAiInsightPage()
    entrances.startRitual('ritual-1')
    entrances.navigateToAiInsight()

    expect(navigateTo).not.toHaveBeenCalled()

    locked.value = false
    entrances.goJourneyDetail()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  test('preserves failure toast behavior only for create and CTA-style AI insight entry', () => {
    const showToast = jest.fn()
    const navigateTo = jest.fn((options) => {
      options.fail?.()
    })

    const entrances = useHomeNavigationEntrances({
      isInteractionLocked: ref(false),
      activeJourneys: ref([createJourney()]),
      navigateTo,
      showToast,
    })

    entrances.goCreate()
    entrances.goAiInsightPage()
    entrances.startRitual('ritual-1')
    entrances.navigateToAiInsight()
    entrances.goJourneyDetail()

    expect(showToast).toHaveBeenCalledTimes(2)
    expect(showToast).toHaveBeenNthCalledWith(1, { title: '页面打开失败', icon: 'none' })
    expect(showToast).toHaveBeenNthCalledWith(2, { title: '页面打开失败', icon: 'none' })
  })
})
