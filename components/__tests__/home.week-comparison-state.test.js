const { useHomeWeekComparisonState } = require('@/composables/useHomeWeekComparisonState')

describe('useHomeWeekComparisonState', () => {
  test('tracks readiness separately from cached week comparison values during refresh', () => {
    const state = useHomeWeekComparisonState()

    state.setWeekComparisonResult([1, 2, 3, 4, 5, 6, 7], 9)
    expect(state.weekCompareReady.value).toBe(true)

    state.beginWeekComparisonRefresh()

    expect(state.weekCompareReady.value).toBe(false)
    expect(state.weekRates.value).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(state.weekDelta.value).toBe(9)
  })

  test('setWeekComparisonResult and resetWeekComparison update the state shell predictably', () => {
    const state = useHomeWeekComparisonState()

    state.setWeekComparisonResult([12, 34, 56, 78, 90, 45, 23], -6)

    expect(state.weekRates.value).toEqual([12, 34, 56, 78, 90, 45, 23])
    expect(state.weekDelta.value).toBe(-6)
    expect(state.weekCompareReady.value).toBe(true)

    state.resetWeekComparison()

    expect(state.weekRates.value).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(state.weekDelta.value).toBe(0)
    expect(state.weekCompareReady.value).toBe(false)
  })

  test('syncWeekProgressForToday updates only the current weekday slot and ignores empty active habits', () => {
    const state = useHomeWeekComparisonState()

    state.setWeekComparisonResult([10, 20, 30, 40, 50, 60, 70], 5)
    state.syncWeekProgressForToday({
      currentDate: '2026-04-10',
      activeHabits: [{ _id: 'habit-1' }, { _id: 'habit-2' }, { _id: '' }],
      todayCheckIns: { size: 2 },
    })

    expect(state.weekRates.value).toEqual([10, 20, 30, 40, 50, 100, 70])

    state.syncWeekProgressForToday({
      currentDate: '2026-04-11',
      activeHabits: [{ _id: 'habit-1' }, { _id: 'habit-2' }, { _id: '' }],
      todayCheckIns: { size: 1 },
    })

    expect(state.weekRates.value).toEqual([10, 20, 30, 40, 50, 100, 50])

    state.syncWeekProgressForToday({
      currentDate: '2026-04-12',
      activeHabits: [{ _id: '' }],
      todayCheckIns: { size: 1 },
    })

    expect(state.weekRates.value).toEqual([10, 20, 30, 40, 50, 100, 50])
  })
})
