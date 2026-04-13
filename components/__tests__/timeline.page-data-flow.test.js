const { ref } = require('vue')
const { useTimelinePageDataFlow } = require('@/composables/useTimelinePageDataFlow')

describe('useTimelinePageDataFlow', () => {
  test('loadDateData marks page loading during the initial selected-date request and restores it after settle', async () => {
    const selectedDate = ref('2026-04-11')
    const loading = ref(false)
    const callOrder = []
    let resolveFetch
    const fetchHabits = jest.fn().mockImplementation(() => new Promise((resolve) => {
      resolveFetch = resolve
    }))

    const flow = useTimelinePageDataFlow({
      selectedDate,
      todayStr: ref('2026-04-10'),
      dateRange: 7,
      setLoading: (value) => {
        callOrder.push(`loading:${value}`)
        loading.value = value
      },
      setRangeCounts: jest.fn(),
      triggerBlocksEntry: jest.fn(),
      setCurrentDate: (date) => callOrder.push(`setCurrentDate:${date}`),
      fetchHabits,
      offsetDate: (date, days) => `${date}:${days}`,
    })

    const pending = flow.loadDateData(true, true)

    expect(loading.value).toBe(true)
    expect(callOrder).toEqual([
      'loading:true',
      'setCurrentDate:2026-04-11',
    ])

    resolveFetch()
    await pending

    expect(fetchHabits).toHaveBeenCalledTimes(1)
    expect(loading.value).toBe(false)
    expect(callOrder).toEqual([
      'loading:true',
      'setCurrentDate:2026-04-11',
      'loading:false',
    ])
  })

  test('loadRangeCounts writes unique per-date counts into the page state shell on success', async () => {
    const rangeCounts = ref(new Map([['stale', 9]]))
    const getCheckInRange = jest.fn().mockResolvedValue([
      { habitId: 'habit-1', date: '2026-04-03' },
      { habitId: 'habit-1', date: '2026-04-03' },
      { habitId: 'habit-2', date: '2026-04-03' },
      { habitId: 'habit-2', date: '2026-04-04' },
      { habitId: '', date: '2026-04-05' },
      { habitId: 'habit-3', date: '' },
    ])

    const flow = useTimelinePageDataFlow({
      selectedDate: ref('2026-04-11'),
      todayStr: ref('2026-04-10'),
      dateRange: 7,
      setLoading: jest.fn(),
      setRangeCounts: (counts) => {
        rangeCounts.value = counts
      },
      triggerBlocksEntry: jest.fn(),
      setCurrentDate: jest.fn(),
      fetchHabits: jest.fn(),
      offsetDate: (date, days) => `${date}:${days}`,
      getCheckInRange,
    })

    await flow.loadRangeCounts()

    expect(getCheckInRange).toHaveBeenCalledWith('', '2026-04-10:-7', '2026-04-10:7')
    expect(Array.from(rangeCounts.value.entries())).toEqual([
      ['2026-04-03', 2],
      ['2026-04-04', 1],
    ])
  })

  test('loadRangeCounts collapses empty / unusable results into an empty range-count map', async () => {
    const rangeCounts = ref(new Map([['stale', 9]]))
    const flow = useTimelinePageDataFlow({
      selectedDate: ref('2026-04-11'),
      todayStr: ref('2026-04-10'),
      dateRange: 7,
      setLoading: jest.fn(),
      setRangeCounts: (counts) => {
        rangeCounts.value = counts
      },
      triggerBlocksEntry: jest.fn(),
      setCurrentDate: jest.fn(),
      fetchHabits: jest.fn(),
      offsetDate: (date, days) => `${date}:${days}`,
      getCheckInRange: jest.fn().mockResolvedValue([
        { habitId: '', date: '2026-04-03' },
        { habitId: 'habit-1', date: '' },
      ]),
    })

    await flow.loadRangeCounts()

    expect(Array.from(rangeCounts.value.entries())).toEqual([])
  })

  test('loadPageEntryData keeps the existing show-time chain: fire range counts in parallel and trigger blocks after the date load settles', async () => {
    const calls = []
    let resolveFetch
    const fetchHabits = jest.fn().mockImplementation(() => new Promise((resolve) => {
      resolveFetch = resolve
    }))
    const getCheckInRange = jest.fn().mockImplementation(async () => {
      calls.push('rangeCounts')
      return []
    })

    const flow = useTimelinePageDataFlow({
      selectedDate: ref('2026-04-11'),
      todayStr: ref('2026-04-10'),
      dateRange: 7,
      setLoading: (value) => calls.push(`loading:${value}`),
      setRangeCounts: () => calls.push('setRangeCounts'),
      triggerBlocksEntry: () => calls.push('triggerBlocksEntry'),
      setCurrentDate: (date) => calls.push(`setCurrentDate:${date}`),
      fetchHabits,
      offsetDate: (date, days) => `${date}:${days}`,
      getCheckInRange,
    })

    flow.loadPageEntryData()
    await Promise.resolve()

    expect(calls).toEqual([
      'loading:true',
      'setCurrentDate:2026-04-11',
      'rangeCounts',
      'setRangeCounts',
    ])

    resolveFetch()
    await Promise.resolve()
    await Promise.resolve()

    expect(calls).toEqual([
      'loading:true',
      'setCurrentDate:2026-04-11',
      'rangeCounts',
      'setRangeCounts',
      'loading:false',
      'triggerBlocksEntry',
    ])
  })

  test('refreshPageData preserves the pull-down refresh contract when range loading fails', async () => {
    const loading = ref(true)
    const rangeCounts = ref(new Map([['stale', 1]]))
    const flow = useTimelinePageDataFlow({
      selectedDate: ref('2026-04-11'),
      todayStr: ref('2026-04-10'),
      dateRange: 7,
      setLoading: (value) => {
        loading.value = value
      },
      setRangeCounts: (counts) => {
        rangeCounts.value = counts
      },
      triggerBlocksEntry: jest.fn(),
      setCurrentDate: jest.fn(),
      fetchHabits: jest.fn().mockResolvedValue(undefined),
      offsetDate: (date, days) => `${date}:${days}`,
      getCheckInRange: jest.fn().mockRejectedValue(new Error('network')),
    })

    await flow.refreshPageData()

    expect(loading.value).toBe(false)
    expect(Array.from(rangeCounts.value.entries())).toEqual([])
  })

  test('loadDateData keeps the page shell stable when the selected-date request fails', async () => {
    const loading = ref(false)
    const flow = useTimelinePageDataFlow({
      selectedDate: ref('2026-04-11'),
      todayStr: ref('2026-04-10'),
      dateRange: 7,
      setLoading: (value) => {
        loading.value = value
      },
      setRangeCounts: jest.fn(),
      triggerBlocksEntry: jest.fn(),
      setCurrentDate: jest.fn(),
      fetchHabits: jest.fn().mockRejectedValue(new Error('network')),
      offsetDate: (date, days) => `${date}:${days}`,
    })

    await expect(flow.loadDateData(true, true)).resolves.toBeUndefined()
    expect(loading.value).toBe(false)
  })

  test('loadPageEntryData stops early when login is not ready', async () => {
    const calls = []
    const flow = useTimelinePageDataFlow({
      ensureLoggedIn: jest.fn().mockResolvedValue(false),
      selectedDate: ref('2026-04-11'),
      todayStr: ref('2026-04-10'),
      dateRange: 7,
      setLoading: (value) => calls.push(`loading:${value}`),
      setRangeCounts: () => calls.push('setRangeCounts'),
      triggerBlocksEntry: () => calls.push('triggerBlocksEntry'),
      setCurrentDate: (date) => calls.push(`setCurrentDate:${date}`),
      fetchHabits: jest.fn(),
      offsetDate: (date, days) => `${date}:${days}`,
      onAuthFailure: () => calls.push('authFailure'),
    })

    flow.loadPageEntryData()
    await Promise.resolve()
    await Promise.resolve()

    expect(calls).toEqual([
      'authFailure',
      'loading:false',
      'setRangeCounts',
    ])
  })
})
