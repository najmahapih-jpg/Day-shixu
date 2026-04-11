const { ref } = require('vue')
const { useTimelineCalendarShell } = require('@/composables/useTimelineCalendarShell')

function createWeekdayGetter(overrides = {}) {
  return (dateStr) => {
    if (Object.prototype.hasOwnProperty.call(overrides, dateStr)) return overrides[dateStr]
    return new Date(`${dateStr}T00:00:00Z`).getUTCDay()
  }
}

describe('useTimelineCalendarShell', () => {
  test('calendarDays maps visible counts into current-month completion metadata', () => {
    const shell = useTimelineCalendarShell({
      todayStr: ref('2026-04-10'),
      rangeCounts: ref(new Map([['2026-04-10', 2]])),
      totalActiveHabits: ref(4),
      weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
      getInitialDateParts: () => ({ year: 2026, month: 4 }),
      getWeekdayFromDateStr: createWeekdayGetter(),
      getHolidayInfo: () => null,
      getLunarDate: () => null,
      getSolarTerm: () => '',
      getUpcomingHolidays: () => [],
      scheduleNextTick: (callback) => callback(),
    })

    expect(shell.calendarDays.value).toHaveLength(42)

    const todayCell = shell.calendarDays.value.find((day) => day.dateStr === '2026-04-10')
    expect(todayCell).toEqual(expect.objectContaining({
      isToday: true,
      isCurrentMonth: true,
      completed: 2,
      total: 4,
      rate: 0.5,
    }))
  })

  test('selectCalDate toggles selected date and reopens the detail panel for a new selection', () => {
    const shell = useTimelineCalendarShell({
      todayStr: ref('2026-04-10'),
      rangeCounts: ref(new Map()),
      totalActiveHabits: ref(4),
      weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
      getInitialDateParts: () => ({ year: 2026, month: 4 }),
      getWeekdayFromDateStr: createWeekdayGetter(),
      getHolidayInfo: () => null,
      getLunarDate: () => null,
      getSolarTerm: () => '',
      getUpcomingHolidays: () => [],
      scheduleNextTick: (callback) => callback(),
    })

    shell.toggleCalHabits()
    expect(shell.calHabitsExpanded.value).toBe(false)

    shell.selectCalDate('2026-04-12')
    expect(shell.calSelectedDate.value).toBe('2026-04-12')
    expect(shell.calHabitsExpanded.value).toBe(true)

    shell.selectCalDate('2026-04-12')
    expect(shell.calSelectedDate.value).toBe('')
  })

  test('month paging updates year-month boundaries, resets selection, and drives flip class lifecycle', () => {
    let pendingFlipReset = null
    const shell = useTimelineCalendarShell({
      todayStr: ref('2026-01-10'),
      rangeCounts: ref(new Map()),
      totalActiveHabits: ref(4),
      weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
      getInitialDateParts: () => ({ year: 2026, month: 1 }),
      getWeekdayFromDateStr: createWeekdayGetter(),
      getHolidayInfo: () => null,
      getLunarDate: () => null,
      getSolarTerm: () => '',
      getUpcomingHolidays: () => [],
      scheduleNextTick: (callback) => callback(),
      setTimeoutFn: (callback) => {
        pendingFlipReset = callback
        return callback
      },
      clearTimeoutFn: jest.fn(),
    })

    shell.selectCalDate('2026-01-10')
    shell.prevMonth()

    expect(shell.calYear.value).toBe(2025)
    expect(shell.calMonth.value).toBe(12)
    expect(shell.calSelectedDate.value).toBe('')
    expect(shell.flipClass.value).toBe('flip-right')

    pendingFlipReset()
    expect(shell.flipClass.value).toBe('')

    shell.nextMonth()
    expect(shell.calYear.value).toBe(2026)
    expect(shell.calMonth.value).toBe(1)
    expect(shell.flipClass.value).toBe('flip-left')
  })

  test('calSelectedSubtitle prefers holiday details while preserving completion counts', () => {
    const shell = useTimelineCalendarShell({
      todayStr: ref('2026-04-10'),
      rangeCounts: ref(new Map([['2026-04-05', 2]])),
      totalActiveHabits: ref(4),
      weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
      getInitialDateParts: () => ({ year: 2026, month: 4 }),
      getWeekdayFromDateStr: createWeekdayGetter({ '2026-04-05': 0 }),
      getHolidayInfo: (dateStr) => (dateStr === '2026-04-05' ? { name: '清明节', type: 'traditional' } : null),
      getLunarDate: () => null,
      getSolarTerm: () => '',
      getUpcomingHolidays: () => [],
      scheduleNextTick: (callback) => callback(),
    })

    shell.selectCalDate('2026-04-05')

    expect(shell.calSelectedSubtitle.value).toContain('2/4')
    expect(shell.calSelectedSubtitle.value).toContain('清明节')
  })
})
