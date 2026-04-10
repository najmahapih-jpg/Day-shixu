const { ref } = require('vue')
const { useHomeWeekComparisonState } = require('@/composables/useHomeWeekComparisonState')
const { useHomeWeekComparisonFlow } = require('@/composables/useHomeWeekComparisonFlow')

describe('useHomeWeekComparisonFlow', () => {
  test('marks the state shell as refreshing before the request chain settles', async () => {
    const state = useHomeWeekComparisonState()
    let resolveFirst
    const firstRequest = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const getCheckInRange = jest
      .fn()
      .mockImplementationOnce(() => firstRequest)
      .mockResolvedValueOnce([])

    state.setWeekComparisonResult([9, 9, 9, 9, 9, 9, 9], 12)

    const flow = useHomeWeekComparisonFlow({
      activeHabits: ref([{ _id: 'habit-1' }]),
      currentDate: ref('2026-04-10'),
      beginWeekComparisonRefresh: state.beginWeekComparisonRefresh,
      setWeekComparisonResult: state.setWeekComparisonResult,
      resetWeekComparison: state.resetWeekComparison,
      getCheckInRange,
    })

    const pending = flow.loadWeekComparison()

    expect(state.weekCompareReady.value).toBe(false)
    expect(state.weekRates.value).toEqual([9, 9, 9, 9, 9, 9, 9])
    expect(state.weekDelta.value).toBe(12)

    resolveFirst([])
    await pending
  })

  test('resets immediately when no active habits are available', async () => {
    const state = useHomeWeekComparisonState()
    const getCheckInRange = jest.fn()

    state.setWeekComparisonResult([1, 2, 3, 4, 5, 6, 7], 9)

    const flow = useHomeWeekComparisonFlow({
      activeHabits: ref([]),
      currentDate: ref('2026-04-10'),
      beginWeekComparisonRefresh: state.beginWeekComparisonRefresh,
      setWeekComparisonResult: state.setWeekComparisonResult,
      resetWeekComparison: state.resetWeekComparison,
      getCheckInRange,
    })

    await flow.loadWeekComparison()

    expect(getCheckInRange).not.toHaveBeenCalled()
    expect(state.weekRates.value).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(state.weekDelta.value).toBe(0)
    expect(state.weekCompareReady.value).toBe(false)
  })

  test('writes computed rates and delta into the week comparison state shell on success', async () => {
    const state = useHomeWeekComparisonState()
    const getCheckInRange = jest
      .fn()
      .mockResolvedValueOnce([
        { habitId: 'habit-1', date: '2026-04-06' },
        { habitId: 'habit-2', date: '2026-04-06' },
        { habitId: 'habit-1', date: '2026-04-07' },
        { habitId: 'inactive', date: '2026-04-10' },
        { habitId: 'habit-2', date: '2026-04-10' },
      ])
      .mockResolvedValueOnce([
        { habitId: 'habit-1', date: '2026-03-30' },
        { habitId: 'inactive', date: '2026-04-03' },
      ])

    const flow = useHomeWeekComparisonFlow({
      activeHabits: ref([{ _id: 'habit-1' }, { _id: 'habit-2' }]),
      currentDate: ref('2026-04-10'),
      beginWeekComparisonRefresh: state.beginWeekComparisonRefresh,
      setWeekComparisonResult: state.setWeekComparisonResult,
      resetWeekComparison: state.resetWeekComparison,
      getCheckInRange,
    })

    await flow.loadWeekComparison()

    expect(getCheckInRange).toHaveBeenNthCalledWith(1, '', '2026-04-06', '2026-04-10')
    expect(getCheckInRange).toHaveBeenNthCalledWith(2, '', '2026-03-30', '2026-04-03')
    expect(state.weekRates.value).toEqual([0, 100, 50, 0, 0, 50, 0])
    expect(state.weekDelta.value).toBe(30)
    expect(state.weekCompareReady.value).toBe(true)
  })

  test('falls back to reset state when the request chain fails', async () => {
    const state = useHomeWeekComparisonState()
    const getCheckInRange = jest.fn().mockRejectedValue(new Error('network'))

    state.setWeekComparisonResult([9, 9, 9, 9, 9, 9, 9], 12)

    const flow = useHomeWeekComparisonFlow({
      activeHabits: ref([{ _id: 'habit-1' }]),
      currentDate: ref('2026-04-10'),
      beginWeekComparisonRefresh: state.beginWeekComparisonRefresh,
      setWeekComparisonResult: state.setWeekComparisonResult,
      resetWeekComparison: state.resetWeekComparison,
      getCheckInRange,
    })

    await flow.loadWeekComparison()

    expect(state.weekRates.value).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(state.weekDelta.value).toBe(0)
    expect(state.weekCompareReady.value).toBe(false)
  })
})
