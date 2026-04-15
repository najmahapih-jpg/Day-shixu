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
    expect(shell.calSelectedSubtitle.value).toBe('2/4 已完成 · 清明节')
  })

  test('calSelectedSubtitle uses normalized empty and weekend labels', () => {
    const shell = useTimelineCalendarShell({
      todayStr: ref('2026-04-10'),
      rangeCounts: ref(new Map()),
      totalActiveHabits: ref(0),
      weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
      getInitialDateParts: () => ({ year: 2026, month: 4 }),
      getWeekdayFromDateStr: createWeekdayGetter({ '2026-04-11': 6 }),
      getHolidayInfo: () => null,
      getLunarDate: () => null,
      getSolarTerm: () => '',
      getUpcomingHolidays: () => [],
      scheduleNextTick: (callback) => callback(),
    })

    expect(shell.calSelectedSubtitle.value).toBe('选择日期')

    shell.selectCalDate('2026-04-11')
    expect(shell.calSelectedSubtitle.value).toBe('暂无安排 · 周末')
  })

  test('calendarDays renders normalized lunar day and month names', () => {
    const shell = useTimelineCalendarShell({
      todayStr: ref('2026-04-10'),
      rangeCounts: ref(new Map()),
      totalActiveHabits: ref(0),
      weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
      getInitialDateParts: () => ({ year: 2026, month: 4 }),
      getWeekdayFromDateStr: createWeekdayGetter(),
      getHolidayInfo: () => null,
      getLunarDate: (dateStr) => {
        if (dateStr === '2026-04-01') return { month: 1, day: 1 }
        if (dateStr === '2026-04-03') return { month: 1, day: 3 }
        return null
      },
      getSolarTerm: () => '',
      getUpcomingHolidays: () => [],
      scheduleNextTick: (callback) => callback(),
    })

    expect(shell.calendarDays.value.find((day) => day.dateStr === '2026-04-01').lunarText).toBe('正月')
    expect(shell.calendarDays.value.find((day) => day.dateStr === '2026-04-03').lunarText).toBe('初三')
  })

  test('countdownLabel and holidayIconClass use normalized Chinese display values', () => {
    const shell = useTimelineCalendarShell({
      todayStr: ref('2026-04-10'),
      rangeCounts: ref(new Map()),
      totalActiveHabits: ref(0),
      weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
      getInitialDateParts: () => ({ year: 2026, month: 4 }),
      getWeekdayFromDateStr: createWeekdayGetter(),
      getHolidayInfo: () => null,
      getLunarDate: () => null,
      getSolarTerm: () => '',
      getUpcomingHolidays: () => [],
      scheduleNextTick: (callback) => callback(),
    })

    expect(shell.countdownLabel(0)).toBe('今天')
    expect(shell.countdownLabel(1)).toBe('明天')
    expect(shell.countdownLabel(2)).toBe('后天')
    expect(shell.countdownLabel(5)).toBe('5天后')
    expect(shell.countdownLabel(-1)).toBe('昨天')
    expect(shell.countdownLabel(-3)).toBe('3天前')

    expect(shell.holidayIconClass({ shortName: '春节' })).toBe('stamp-icon--chunlian')
    expect(shell.holidayIconClass({ shortName: '端午' })).toBe('stamp-icon--dragonboat')
    expect(shell.holidayIconClass({ shortName: '清明' })).toBe('stamp-icon--willow')
    expect(shell.holidayIconClass({ shortName: '劳动' })).toBe('stamp-icon--hammer')
    expect(shell.holidayIconClass({ shortName: '双11' })).toBe('stamp-icon--bars')
    expect(shell.holidayIconClass({ shortName: '未知节日' })).toBe('stamp-icon--star')
  })
})
