const { computed, ref } = require('vue')
const { useTimelineDateDisplay } = require('@/composables/useTimelineDateDisplay')

describe('useTimelineDateDisplay', () => {
  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']

  function createDisplay(overrides = {}) {
    return useTimelineDateDisplay({
      selectedDate: ref('2026-04-10'),
      todayStr: ref('2026-04-10'),
      rangeCounts: ref(new Map([
        ['2026-04-09', 2],
        ['2026-04-10', 1],
      ])),
      dateRange: 1,
      weekdayLabels,
      reduceMotion: ref(false),
      offsetDate: (dateStr, days) => {
        const [y, m, d] = dateStr.split('-').map(Number)
        const next = new Date(Date.UTC(y, m - 1, d + days))
        return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
      },
      getWeekdayFromDateStr: (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay(),
      ...overrides,
    })
  }

  test('derives today / future / past flags and selected-date labels', () => {
    const selectedDate = ref('2026-04-10')
    const todayStr = ref('2026-04-10')
    const display = createDisplay({ selectedDate, todayStr })

    expect(display.isToday.value).toBe(true)
    expect(display.isFuture.value).toBe(false)
    expect(display.isPastDay.value).toBe(false)
    expect(display.formattedSelectedDate.value).toBe('4月10日')
    expect(display.monthDisplay.value).toBe('4月')
    expect(display.selectedDateAnchor.value).toBe('d-2026-04-10')

    selectedDate.value = '2026-04-11'
    expect(display.isFuture.value).toBe(true)

    selectedDate.value = '2026-04-09'
    expect(display.isPastDay.value).toBe(true)
  })

  test('builds date strip items from today-centered range and check-in counts', () => {
    const display = createDisplay()

    expect(display.dateList.value).toEqual([
      {
        date: '2026-04-09',
        day: 9,
        weekday: '四',
        isToday: false,
        checkInCount: 2,
        month: 4,
      },
      {
        date: '2026-04-10',
        day: 10,
        weekday: '五',
        isToday: true,
        checkInCount: 1,
        month: 4,
      },
      {
        date: '2026-04-11',
        day: 11,
        weekday: '六',
        isToday: false,
        checkInCount: 0,
        month: 4,
      },
    ])
  })

  test('returns stable arc styles and disables them under reduce motion', () => {
    const reduceMotion = ref(false)
    const display = createDisplay({ reduceMotion })

    expect(display.getDateArcStyle(1)).toEqual({
      transform: 'scale(1.00) translateY(0rpx) rotate(0.0deg)',
      opacity: '1.00',
      transition: 'transform 350ms cubic-bezier(0.34, 1.3, 0.64, 1), opacity 250ms ease',
    })

    reduceMotion.value = true
    expect(display.getDateArcStyle(0)).toEqual({})
  })
})
