const { useHomeEntryEffects } = require('@/composables/useHomeEntryEffects')

function createRuntime(options = {}) {
  const storage = new Map(Object.entries(options.storage || {}))

  return {
    getStorageSync: jest.fn((key) => storage.get(key)),
    setStorageSync: jest.fn((key, value) => {
      storage.set(key, value)
    }),
    getAppInstance: jest.fn(() => options.app),
    reLaunch: jest.fn(({ fail, complete }) => {
      if (options.failRedirect) {
        fail?.()
      }
      complete?.()
    }),
    showToast: jest.fn(),
    readStorage: () => storage,
  }
}

describe('useHomeEntryEffects', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('hydrates AI cache and first-use tip state without touching main data orchestration', () => {
    const insight = {
      generatedAt: '2026-04-10T00:00:00.000Z',
      summary: 'summary',
      recommendations: ['r1', 'r2'],
      slogans: ['keep going'],
      trend: {
        thisWeekRate: 88,
        lastWeekRate: 76,
        delta: 12,
        direction: 'up',
        analysis: 'analysis',
        bestDay: 'fri',
      },
      source: 'rule-engine',
      model: 'local',
    }

    const runtime = createRuntime({
      storage: {
        hasOnboarded: 'true',
        hf_ai_insight_cache_v1: JSON.stringify({ insight }),
      },
    })

    const entryEffects = useHomeEntryEffects(runtime)

    expect(entryEffects.initializeEntryEffects()).toBe(false)
    expect(entryEffects.showFirstUseTip.value).toBe(true)
    expect(entryEffects.aiInsight.value).toEqual(insight)
    expect(runtime.reLaunch).not.toHaveBeenCalled()
  })

  test('dismissFirstUseTip hides the tip and persists the completion flag', () => {
    const runtime = createRuntime({
      storage: {
        hasOnboarded: 'true',
      },
    })

    const entryEffects = useHomeEntryEffects(runtime)
    entryEffects.initializeEntryEffects()

    expect(entryEffects.showFirstUseTip.value).toBe(true)

    entryEffects.dismissFirstUseTip()

    expect(entryEffects.showFirstUseTip.value).toBe(false)
    expect(runtime.setStorageSync).toHaveBeenCalledWith('hf_first_use_tip_v2', '1')
    expect(runtime.readStorage().get('hf_first_use_tip_v2')).toBe('1')
  })

  test('redirects to onboarding when onboarding is incomplete and suppresses duplicate redirects until reset', () => {
    const runtime = createRuntime({
      storage: {},
    })

    const entryEffects = useHomeEntryEffects(runtime)

    expect(entryEffects.initializeEntryEffects()).toBe(true)
    expect(runtime.reLaunch).toHaveBeenCalledTimes(1)

    expect(entryEffects.initializeEntryEffects()).toBe(true)
    expect(runtime.reLaunch).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(800)

    expect(entryEffects.initializeEntryEffects()).toBe(true)
    expect(runtime.reLaunch).toHaveBeenCalledTimes(2)
  })

  test('uses runtime onboarding completion flag and surfaces redirect failures via toast', () => {
    const onboardedRuntime = createRuntime({
      app: { __hfOnboardingCompleted: true, globalData: {} },
      storage: {},
    })

    const onboardedEffects = useHomeEntryEffects(onboardedRuntime)

    expect(onboardedEffects.initializeEntryEffects()).toBe(false)
    expect(onboardedRuntime.reLaunch).not.toHaveBeenCalled()

    const failingRuntime = createRuntime({
      storage: {},
      failRedirect: true,
    })

    const failingEffects = useHomeEntryEffects(failingRuntime)

    expect(failingEffects.initializeEntryEffects()).toBe(true)
    expect(failingRuntime.showToast).toHaveBeenCalledWith({ title: '引导页跳转失败', icon: 'none' })
  })

  test('fails closed and redirects to onboarding when storage read throws', () => {
    const runtime = createRuntime({
      app: { __hfOnboardingCompleted: false, globalData: {} },
    })
    runtime.getStorageSync.mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    const entryEffects = useHomeEntryEffects(runtime)

    expect(entryEffects.initializeEntryEffects()).toBe(true)
    expect(runtime.reLaunch).toHaveBeenCalledTimes(1)
  })
})
