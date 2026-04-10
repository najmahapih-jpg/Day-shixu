function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve))
}

function createHabit(overrides = {}) {
  return {
    _id: 'habit-1',
    _openid: 'user-1',
    createdAt: '2026-04-01T08:00:00+08:00',
    updatedAt: '2026-04-01T08:00:00+08:00',
    name: 'Drink Water',
    icon: 'drop',
    color: '#00AEEF',
    category: 'health',
    type: 'boolean',
    targetValue: 1,
    unit: 'times',
    frequency: 'daily',
    customDays: [],
    reminderTime: '',
    ritualId: '',
    order: 1,
    isArchived: false,
    streakCurrent: 2,
    streakLongest: 4,
    totalCompletions: 10,
    ...overrides,
  }
}

function createCheckIn(overrides = {}) {
  return {
    _id: 'checkin-1',
    _openid: 'user-1',
    habitId: 'habit-1',
    date: '2026-04-09',
    value: 1,
    completed: true,
    completedAt: '2026-04-09T09:00:00+08:00',
    createdAt: '2026-04-09T09:00:00+08:00',
    updatedAt: '2026-04-09T09:00:00+08:00',
    ...overrides,
  }
}

function weekday1to7(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

function buildUni() {
  return {
    showToast: jest.fn(),
    getStorageSync: jest.fn(),
    setStorageSync: jest.fn(),
    removeStorageSync: jest.fn(),
    getStorageInfoSync: jest.fn(() => ({ keys: [] })),
  }
}

function createMocks() {
  return {
    habitService: {
      getHabits: jest.fn(),
      getCheckIns: jest.fn(),
      doCheckIn: jest.fn(),
      undoCheckIn: jest.fn(),
      createHabit: jest.fn(),
      updateHabit: jest.fn(),
      deleteHabit: jest.fn(),
      getArchivedHabits: jest.fn(),
      restoreHabit: jest.fn(),
      getFreezeStatus: jest.fn(),
      freezeToday: jest.fn(),
    },
    cloud: {
      getToday: jest.fn(() => '2026-04-09'),
      getWeekday1to7FromDateStr: jest.fn((dateStr) => weekday1to7(dateStr)),
      getBeijingIsoNow: jest.fn(() => '2026-04-09T09:00:00+08:00'),
    },
    cache: {
      getCache: jest.fn(() => null),
      setCache: jest.fn(),
    },
    retry: {
      withRetry: jest.fn((fn) => fn()),
    },
  }
}

function loadHabitStore(mocks) {
  jest.resetModules()
  jest.doMock('@/services/habitService', () => mocks.habitService)
  jest.doMock('@/services/cloud', () => mocks.cloud)
  jest.doMock('@/utils/cache', () => mocks.cache)
  jest.doMock('@/utils/retry', () => mocks.retry)

  const { useHabitStore } = require('@/stores/habit')
  return useHabitStore()
}

describe('useHabitStore high-value state protections', () => {
  let mockUni
  let mocks
  let store

  beforeEach(() => {
    mockUni = buildUni()
    global.uni = mockUni
    mocks = createMocks()
    store = loadHabitStore(mocks)
    store.$reset()
  })

  afterEach(() => {
    delete global.uni
    jest.clearAllMocks()
  })

  test('checkIn applies optimistic state immediately and syncs server streak on success', async () => {
    store.habits = [createHabit()]
    const deferred = createDeferred()
    mocks.habitService.doCheckIn.mockReturnValue(deferred.promise)

    const action = store.checkIn('habit-1', 2)

    expect(mocks.habitService.doCheckIn).toHaveBeenCalledWith('habit-1', 2, '2026-04-09')
    expect(store.todayCheckIns.get('habit-1')).toEqual(expect.objectContaining({
      habitId: 'habit-1',
      value: 2,
      completed: true,
      date: '2026-04-09',
    }))
    expect(store.habits[0]).toEqual(expect.objectContaining({
      streakCurrent: 3,
      totalCompletions: 11,
    }))

    deferred.resolve(createCheckIn({
      value: 2,
      streakCurrent: 7,
      streakLongest: 7,
      completedAt: '2026-04-09T09:30:00+08:00',
      updatedAt: '2026-04-09T09:30:00+08:00',
    }))
    await action

    expect(store.todayCheckIns.get('habit-1')).toEqual(expect.objectContaining({
      value: 2,
      streakCurrent: 7,
      completedAt: '2026-04-09T09:30:00+08:00',
    }))
    expect(store.habits[0]).toEqual(expect.objectContaining({
      streakCurrent: 7,
      streakLongest: 7,
      totalCompletions: 11,
    }))
  })

  test('checkIn rolls back optimistic state and surfaces failure toast', async () => {
    const originalHabit = createHabit()
    store.habits = [originalHabit]
    mocks.habitService.doCheckIn.mockRejectedValue(new Error('network down'))

    await expect(store.checkIn('habit-1')).rejects.toThrow('network down')

    expect(store.todayCheckIns.size).toBe(0)
    expect(store.habits).toEqual([originalHabit])
    expect(mockUni.showToast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'none' }))
  })

  test('checkIn lock suppresses duplicate concurrent submissions and unlocks after completion', async () => {
    store.habits = [createHabit()]
    const deferred = createDeferred()
    mocks.habitService.doCheckIn.mockReturnValue(deferred.promise)

    const first = store.checkIn('habit-1')
    const second = store.checkIn('habit-1')

    await expect(second).resolves.toBeUndefined()
    expect(mocks.habitService.doCheckIn).toHaveBeenCalledTimes(1)
    expect(store.todayCheckIns.size).toBe(1)

    deferred.resolve(createCheckIn({ streakCurrent: 3 }))
    await first

    mocks.habitService.doCheckIn.mockResolvedValueOnce(createCheckIn({
      _id: 'checkin-2',
      streakCurrent: 4,
      updatedAt: '2026-04-09T10:00:00+08:00',
    }))
    await store.checkIn('habit-1')
    expect(mocks.habitService.doCheckIn).toHaveBeenCalledTimes(2)
  })

  test('uncheckIn updates state optimistically and then syncs server streak', async () => {
    store.habits = [createHabit({ streakCurrent: 3, totalCompletions: 8 })]
    store.todayCheckIns = new Map([
      ['habit-1', createCheckIn()],
    ])
    const deferred = createDeferred()
    mocks.habitService.undoCheckIn.mockReturnValue(deferred.promise)

    const action = store.uncheckIn('habit-1')

    expect(store.todayCheckIns.has('habit-1')).toBe(false)
    expect(store.habits[0]).toEqual(expect.objectContaining({
      streakCurrent: 2,
      totalCompletions: 7,
    }))

    deferred.resolve({ _id: 'undo-1', streakCurrent: 1 })
    await action

    expect(store.habits[0]).toEqual(expect.objectContaining({
      streakCurrent: 1,
      totalCompletions: 7,
    }))
  })

  test('uncheckIn restores previous state on failure', async () => {
    const originalHabit = createHabit({ streakCurrent: 4, totalCompletions: 9 })
    const originalCheckIn = createCheckIn()
    store.habits = [originalHabit]
    store.todayCheckIns = new Map([['habit-1', originalCheckIn]])
    mocks.habitService.undoCheckIn.mockRejectedValue(new Error('undo failed'))

    await expect(store.uncheckIn('habit-1')).rejects.toThrow('undo failed')

    expect(store.habits).toEqual([originalHabit])
    expect(Array.from(store.todayCheckIns.entries())).toEqual([['habit-1', originalCheckIn]])
    expect(mockUni.showToast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'none' }))
  })

  test('fetchHabits ignores stale responses that resolve after a newer fetch', async () => {
    const habitsFirst = createDeferred()
    const checkInsFirst = createDeferred()
    const habitsSecond = createDeferred()
    const checkInsSecond = createDeferred()

    mocks.habitService.getHabits
      .mockReturnValueOnce(habitsFirst.promise)
      .mockReturnValueOnce(habitsSecond.promise)
    mocks.habitService.getCheckIns
      .mockReturnValueOnce(checkInsFirst.promise)
      .mockReturnValueOnce(checkInsSecond.promise)

    const firstFetch = store.fetchHabits()
    const secondFetch = store.fetchHabits()

    expect(store.loading).toBe(true)

    habitsSecond.resolve([createHabit({ _id: 'habit-new', name: 'Newest Habit', totalCompletions: 20 })])
    checkInsSecond.resolve([createCheckIn({ _id: 'checkin-new', habitId: 'habit-new' })])
    await secondFetch

    expect(store.habits.map((habit) => habit._id)).toEqual(['habit-new'])
    expect(Array.from(store.todayCheckIns.keys())).toEqual(['habit-new'])

    habitsFirst.resolve([createHabit({ _id: 'habit-old', name: 'Older Habit' })])
    checkInsFirst.resolve([createCheckIn({ _id: 'checkin-old', habitId: 'habit-old' })])
    await firstFetch

    expect(store.habits.map((habit) => habit._id)).toEqual(['habit-new'])
    expect(Array.from(store.todayCheckIns.keys())).toEqual(['habit-new'])
    expect(mocks.cache.setCache).toHaveBeenCalledTimes(1)
    expect(store.loading).toBe(false)
  })

  test('todayHabits keeps only habits scheduled for the mocked today window', () => {
    mocks.cloud.getToday.mockReturnValue('2026-04-06')
    mocks.cloud.getWeekday1to7FromDateStr.mockImplementation((dateStr) => weekday1to7(dateStr))

    store.$reset()
    store.habits = [
      createHabit({ _id: 'daily', name: 'Daily', frequency: 'daily' }),
      createHabit({ _id: 'weekday', name: 'Weekday', frequency: 'weekdays' }),
      createHabit({ _id: 'weekend', name: 'Weekend', frequency: 'weekends' }),
      createHabit({ _id: 'custom-hit', name: 'Custom Hit', frequency: 'custom', customDays: [1, 3] }),
      createHabit({ _id: 'custom-miss', name: 'Custom Miss', frequency: 'custom', customDays: [2, 5] }),
      createHabit({ _id: 'future', name: 'Future', startDate: '2026-04-07' }),
      createHabit({ _id: 'expired', name: 'Expired', endDate: '2026-04-05' }),
      createHabit({ _id: 'archived', name: 'Archived', isArchived: true }),
    ]

    expect(store.todayHabits.map((habit) => habit._id)).toEqual([
      'daily',
      'weekday',
      'custom-hit',
    ])
    expect(store.pendingHabits.map((habit) => habit._id)).toEqual([
      'daily',
      'weekday',
      'custom-hit',
    ])
  })

  test('refreshDateIfNeeded refreshes currentDate and re-fetches when app crosses midnight', async () => {
    store.currentDate = '2026-04-08'
    mocks.habitService.getHabits.mockResolvedValue([createHabit({ _id: 'habit-refresh', name: 'Refreshed' })])
    mocks.habitService.getCheckIns.mockResolvedValue([])

    await store.refreshDateIfNeeded()
    await flushPromises()

    expect(store.currentDate).toBe('2026-04-09')
    expect(mocks.habitService.getHabits).toHaveBeenCalledTimes(1)
    expect(mocks.habitService.getCheckIns).toHaveBeenCalledWith('', '2026-04-09')
  })
})
