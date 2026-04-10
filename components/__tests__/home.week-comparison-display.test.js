const { ref } = require('vue')
const { useHomeWeekComparisonDisplay } = require('@/composables/useHomeWeekComparisonDisplay')

describe('useHomeWeekComparisonDisplay', () => {
  test('maps Beijing weekday to the showcase today index, including Sunday fallback', () => {
    const weekdayRef = ref(0)
    const display = useHomeWeekComparisonDisplay({
      weekRates: ref([]),
      weekDelta: ref(0),
      weekCompareReady: ref(false),
      getDateParts: () => ({ weekday: weekdayRef.value }),
      getTodayDate: () => '2026-04-10',
    })

    expect(display.getBaseTodayIndex()).toBe(6)

    weekdayRef.value = 4
    expect(display.getBaseTodayIndex()).toBe(3)
  })

  test('derives week comparison copy for ready and fallback branches', () => {
    const ready = ref(false)
    const delta = ref(0)
    const display = useHomeWeekComparisonDisplay({
      weekRates: ref([]),
      weekDelta: delta,
      weekCompareReady: ready,
      getDateParts: () => ({ weekday: 5 }),
      getTodayDate: () => '2026-04-10',
    })

    expect(display.weekCompareText.value).toBe('本周趋势')

    ready.value = true
    delta.value = 12
    expect(display.weekCompareText.value).toBe('本周较上周 +12%')

    delta.value = -7
    expect(display.weekCompareText.value).toBe('本周较上周 -7%')

    delta.value = 0
    expect(display.weekCompareText.value).toBe('本周较上周持平')
  })

  test('builds week card data with stable weekday labels, clamped rates, levels, and today marker', () => {
    const display = useHomeWeekComparisonDisplay({
      weekRates: ref([5, 82, 45, 1, 0, 110, -5]),
      weekDelta: ref(0),
      weekCompareReady: ref(true),
      getDateParts: () => ({ weekday: 5 }),
      getTodayDate: () => '2026-04-10',
    })

    expect(display.weekCardData.value).toHaveLength(7)
    expect(display.weekCardData.value[0]).toEqual({
      date: '2026-04-06',
      weekday: '一',
      day: 6,
      rate: 82,
      level: 'strong',
      isToday: false,
      illustration: 'home-week-mon',
    })
    expect(display.weekCardData.value[2].level).toBe('light')
    expect(display.weekCardData.value[4]).toEqual({
      date: '2026-04-10',
      weekday: '五',
      day: 10,
      rate: 100,
      level: 'strong',
      isToday: true,
      illustration: 'home-week-fri',
    })
    expect(display.weekCardData.value[5].rate).toBe(0)
    expect(display.weekCardData.value[6]).toEqual({
      date: '2026-04-12',
      weekday: '日',
      day: 12,
      rate: 5,
      level: 'light',
      isToday: false,
      illustration: 'home-week-sun',
    })
  })
})
