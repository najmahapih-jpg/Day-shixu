const { useHomePageDataBus } = require('@/composables/useHomePageDataBus')

describe('useHomePageDataBus', () => {
  test('loadHomeOnShowData preserves the onShow bus order and does not await the date-refresh preflight', async () => {
    const calls = []
    let resolveRefreshDate
    let resolveFetchHabits

    const flow = useHomePageDataBus({
      resetDynamicLogs: () => calls.push('resetDynamicLogs'),
      startDynamicLogs: () => calls.push('startDynamicLogs'),
      refreshDateIfNeeded: () => {
        calls.push('refreshDateIfNeeded')
        return new Promise((resolve) => {
          resolveRefreshDate = resolve
        })
      },
      fetchHabits: () => {
        calls.push('fetchHabits')
        return new Promise((resolve) => {
          resolveFetchHabits = resolve
        })
      },
      loadWeekComparison: async () => {
        calls.push('loadWeekComparison')
      },
      fetchUserJourneys: async () => {
        calls.push('fetchUserJourneys')
      },
      refreshAiInsightFromCache: () => calls.push('refreshAiInsightFromCache'),
      runSafe: async (fn) => {
        calls.push('runSafe:start')
        await fn()
        calls.push('runSafe:end')
      },
    })

    flow.loadHomeOnShowData()
    await Promise.resolve()

    expect(calls).toEqual([
      'resetDynamicLogs',
      'startDynamicLogs',
      'refreshDateIfNeeded',
      'runSafe:start',
      'fetchHabits',
      'fetchUserJourneys',
    ])

    resolveFetchHabits()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(calls).toEqual([
      'resetDynamicLogs',
      'startDynamicLogs',
      'refreshDateIfNeeded',
      'runSafe:start',
      'fetchHabits',
      'fetchUserJourneys',
      'loadWeekComparison',
      'runSafe:end',
    ])

    resolveRefreshDate()
  })

  test('loadHomeOnShowData swallows journey refresh failures without disturbing the main bus', async () => {
    const calls = []
    const flow = useHomePageDataBus({
      resetDynamicLogs: () => calls.push('resetDynamicLogs'),
      startDynamicLogs: () => calls.push('startDynamicLogs'),
      refreshDateIfNeeded: async () => {
        calls.push('refreshDateIfNeeded')
      },
      fetchHabits: async () => {
        calls.push('fetchHabits')
      },
      loadWeekComparison: async () => {
        calls.push('loadWeekComparison')
      },
      fetchUserJourneys: async () => {
        calls.push('fetchUserJourneys')
        throw new Error('journey failed')
      },
      refreshAiInsightFromCache: () => calls.push('refreshAiInsightFromCache'),
      runSafe: async (fn) => {
        calls.push('runSafe:start')
        await fn()
        calls.push('runSafe:end')
      },
    })

    expect(() => flow.loadHomeOnShowData()).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(calls).toEqual([
      'resetDynamicLogs',
      'startDynamicLogs',
      'refreshDateIfNeeded',
      'runSafe:start',
      'fetchHabits',
      'fetchUserJourneys',
      'loadWeekComparison',
      'runSafe:end',
    ])
  })

  test('refreshHomeData runs the refresh bus and re-hydrates AI cache before stopping pull-down', async () => {
    const calls = []
    const flow = useHomePageDataBus({
      resetDynamicLogs: () => calls.push('resetDynamicLogs'),
      startDynamicLogs: () => calls.push('startDynamicLogs'),
      refreshDateIfNeeded: async () => {
        calls.push('refreshDateIfNeeded')
      },
      fetchHabits: async () => {
        calls.push('fetchHabits')
      },
      loadWeekComparison: async () => {
        calls.push('loadWeekComparison')
      },
      fetchUserJourneys: async () => {
        calls.push('fetchUserJourneys')
      },
      refreshAiInsightFromCache: () => calls.push('refreshAiInsightFromCache'),
      runSafe: async (fn) => {
        calls.push('runSafe:start')
        await fn()
        calls.push('runSafe:end')
      },
      stopPullDownRefresh: () => calls.push('stopPullDownRefresh'),
    })

    await flow.refreshHomeData()

    expect(calls).toEqual([
      'runSafe:start',
      'fetchHabits',
      'loadWeekComparison',
      'refreshAiInsightFromCache',
      'runSafe:end',
      'stopPullDownRefresh',
    ])
  })

  test('refreshHomeData still stops pull-down when the guarded refresh chain fails', async () => {
    const calls = []
    const flow = useHomePageDataBus({
      resetDynamicLogs: () => calls.push('resetDynamicLogs'),
      startDynamicLogs: () => calls.push('startDynamicLogs'),
      refreshDateIfNeeded: async () => {
        calls.push('refreshDateIfNeeded')
      },
      fetchHabits: async () => {
        calls.push('fetchHabits')
      },
      loadWeekComparison: async () => {
        calls.push('loadWeekComparison')
      },
      fetchUserJourneys: async () => {
        calls.push('fetchUserJourneys')
      },
      refreshAiInsightFromCache: () => calls.push('refreshAiInsightFromCache'),
      runSafe: async () => {
        calls.push('runSafe:start')
        throw new Error('page error')
      },
      stopPullDownRefresh: () => calls.push('stopPullDownRefresh'),
    })

    await expect(flow.refreshHomeData()).rejects.toThrow('page error')
    expect(calls).toEqual([
      'runSafe:start',
      'stopPullDownRefresh',
    ])
  })

  test('loadHomeOnShowData blocks cloud fetches when login is not ready', async () => {
    const calls = []
    const flow = useHomePageDataBus({
      ensureLoggedIn: jest.fn().mockResolvedValue(false),
      resetDynamicLogs: () => calls.push('resetDynamicLogs'),
      startDynamicLogs: () => calls.push('startDynamicLogs'),
      refreshDateIfNeeded: async () => {
        calls.push('refreshDateIfNeeded')
      },
      fetchHabits: async () => {
        calls.push('fetchHabits')
      },
      loadWeekComparison: async () => {
        calls.push('loadWeekComparison')
      },
      fetchUserJourneys: async () => {
        calls.push('fetchUserJourneys')
      },
      refreshAiInsightFromCache: () => calls.push('refreshAiInsightFromCache'),
      runSafe: async (fn) => {
        calls.push('runSafe:start')
        await fn()
        calls.push('runSafe:end')
      },
      clearPageError: () => calls.push('clearPageError'),
    })

    flow.loadHomeOnShowData()
    await Promise.resolve()
    await Promise.resolve()

    expect(calls).toEqual([
      'resetDynamicLogs',
      'startDynamicLogs',
      'clearPageError',
    ])
  })
})
