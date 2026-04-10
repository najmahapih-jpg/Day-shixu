const { useTimelineClockShell } = require('@/composables/useTimelineClockShell')

describe('useTimelineClockShell', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('refreshes minute and today state from injected providers', () => {
    let minute = 610
    let today = '2026-04-10'

    const shell = useTimelineClockShell({
      getCurrentMinute: () => minute,
      getTodayDate: () => today,
      tickIntervalMs: 1000,
    })

    expect(shell.nowMinuteOfDay.value).toBe(610)
    expect(shell.todayStr.value).toBe('2026-04-10')

    minute = 0
    today = '2026-04-11'
    shell.refreshClock()

    expect(shell.nowMinuteOfDay.value).toBe(0)
    expect(shell.todayStr.value).toBe('2026-04-11')
  })

  test('startMinuteTimer keeps minute and today boundary synchronized', () => {
    let minute = 610
    let today = '2026-04-10'

    const shell = useTimelineClockShell({
      getCurrentMinute: () => minute,
      getTodayDate: () => today,
      tickIntervalMs: 1000,
    })

    shell.startMinuteTimer()

    minute = 611
    jest.advanceTimersByTime(1000)
    expect(shell.nowMinuteOfDay.value).toBe(611)
    expect(shell.todayStr.value).toBe('2026-04-10')

    minute = 0
    today = '2026-04-11'
    jest.advanceTimersByTime(1000)
    expect(shell.nowMinuteOfDay.value).toBe(0)
    expect(shell.todayStr.value).toBe('2026-04-11')
  })

  test('stopMinuteTimer and resetClockShell prevent stale timer updates', () => {
    let minute = 610
    let today = '2026-04-10'

    const shell = useTimelineClockShell({
      getCurrentMinute: () => minute,
      getTodayDate: () => today,
      tickIntervalMs: 1000,
    })

    shell.startMinuteTimer()
    minute = 611
    jest.advanceTimersByTime(1000)
    expect(shell.nowMinuteOfDay.value).toBe(611)

    shell.stopMinuteTimer()
    minute = 612
    jest.advanceTimersByTime(5000)
    expect(shell.nowMinuteOfDay.value).toBe(611)

    minute = 700
    today = '2026-04-12'
    shell.resetClockShell()
    expect(shell.nowMinuteOfDay.value).toBe(700)
    expect(shell.todayStr.value).toBe('2026-04-12')
  })
})
