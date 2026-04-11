const { loadComponent, renderComponent, getEmitNames, getSetupBindings } = require('./helpers/vue-test-helpers')

describe('timeline calendar nav/grid contracts', () => {
  test('TimelineCalendarNav renders year/month/subtitle and preserves prev/next emits', async () => {
    const component = loadComponent('@/components/timeline/TimelineCalendarNav.vue')
    const html = await renderComponent(component, {
      year: 2026,
      month: 4,
      subtitle: '2/4 完成',
    })

    expect(html).toContain('2026')
    expect(html).toContain('4')
    expect(html).toContain('2/4 完成')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['prev-month', 'next-month']))

    const emitted = []
    const bindings = getSetupBindings(component, {
      year: 2026,
      month: 4,
      subtitle: '2/4 完成',
    }, (name, ...payload) => emitted.push([name, ...payload]))

    bindings.handlePrev()
    bindings.handleNext()

    expect(emitted).toEqual([
      ['prev-month'],
      ['next-month'],
    ])
  })

  test('TimelineCalendarGrid renders weekday/cell states and preserves select-date emit contract', async () => {
    const component = loadComponent('@/components/timeline/TimelineCalendarGrid.vue')
    const html = await renderComponent(component, {
      weekdayLabels: ['日', '一', '二'],
      selectedDate: '2026-04-10',
      flipClass: 'flip-left',
      calendarDays: [
        {
          dateStr: '2026-04-10',
          day: 10,
          isToday: true,
          isCurrentMonth: true,
          isWeekend: false,
          holidayFull: '清明',
          holidayType: 'traditional',
          lunarText: '',
          solarTerm: '清明',
          total: 4,
          completed: 4,
          rate: 1,
        },
        {
          dateStr: '2026-04-11',
          day: 11,
          isToday: false,
          isCurrentMonth: true,
          isWeekend: true,
          holidayFull: '',
          holidayType: '',
          lunarText: '初三',
          solarTerm: '',
          total: 4,
          completed: 2,
          rate: 0.5,
        },
        {
          dateStr: '2026-03-31',
          day: 31,
          isToday: false,
          isCurrentMonth: false,
          isWeekend: false,
          holidayFull: '',
          holidayType: '',
          lunarText: '',
          solarTerm: '',
          total: 0,
          completed: 0,
          rate: 0,
        },
      ],
    })

    expect(html).toContain('flip-left')
    expect(html).toContain('calendar-cell')
    expect(html).toContain('is-today')
    expect(html).toContain('is-selected')
    expect(html).toContain('has-holiday')
    expect(html).toContain('is-completed')
    expect(html).toContain('is-partial')
    expect(html).toContain('other-month')
    expect(html).toContain('清明')
    expect(html).toContain('初三')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['select-date']))

    const emitted = []
    const bindings = getSetupBindings(component, {
      weekdayLabels: [],
      selectedDate: '',
      flipClass: '',
      calendarDays: [],
    }, (name, ...payload) => emitted.push([name, ...payload]))

    bindings.handleSelect('2026-04-11')
    expect(emitted).toEqual([['select-date', '2026-04-11']])
  })
})
