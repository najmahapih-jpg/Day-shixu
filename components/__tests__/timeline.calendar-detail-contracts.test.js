const { defineComponent, h } = require('vue')
const { loadComponent, renderComponent, getEmitNames, getSetupBindings } = require('./helpers/vue-test-helpers')

jest.mock('@/components/habit/HabitListItem.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'HabitListItemStub',
    props: ['habit'],
    emits: ['check', 'uncheck', 'delete'],
    setup(props) {
      return () => h('div', { class: 'habit-list-item-stub' }, props.habit?.name || '')
    },
  }),
}))

describe('timeline calendar detail/almanac contracts', () => {
  test('TimelineCalendarDetail renders selected-date detail and keeps toggle / habit action emits contract', async () => {
    const component = loadComponent('@/components/timeline/TimelineCalendarDetail.vue')
    const html = await renderComponent(component, {
      selectedDate: '2026-04-10',
      todayStr: '2026-04-10',
      subtitle: '2/4 完成',
      habitsExpanded: true,
      todayHabits: [
        { _id: 'habit-1', name: 'Focus' },
      ],
      todayCheckIns: new Map(),
    })

    expect(html).toContain('2/4 完成')
    expect(html).toContain('habit-list-item-stub')
    expect(html).toContain('Focus')
    expect(html).toContain('ticket-toggle__label')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['toggle-habits', 'check', 'uncheck', 'delete']))

    const emitted = []
    const bindings = getSetupBindings(component, {
      selectedDate: '2026-04-10',
      todayStr: '2026-04-10',
      subtitle: '2/4 完成',
      habitsExpanded: false,
      todayHabits: [],
      todayCheckIns: new Map(),
    }, (name, ...payload) => emitted.push([name, ...payload]))

    bindings.emitToggleHabits()
    bindings.emitCheck('habit-1', 1)
    bindings.emitUncheck('habit-1')
    bindings.emitDelete('habit-1')

    expect(emitted).toEqual([
      ['toggle-habits'],
      ['check', 'habit-1', 1],
      ['uncheck', 'habit-1'],
      ['delete', 'habit-1'],
    ])
  })

  test('TimelineCalendarDetail falls back to empty state when selected day is not today or has no habits', async () => {
    const component = loadComponent('@/components/timeline/TimelineCalendarDetail.vue')
    const html = await renderComponent(component, {
      selectedDate: '2026-04-11',
      todayStr: '2026-04-10',
      subtitle: '0/0',
      habitsExpanded: true,
      todayHabits: [],
      todayCheckIns: new Map(),
    })

    expect(html).toContain('cal-habit-empty')
    expect(html).toContain('ticket-toggle__label')
    expect(html).not.toContain('habit-list-item-stub')
  })

  test('TimelineHolidayAlmanac renders holiday cards and preserves today countdown styling', async () => {
    const component = loadComponent('@/components/timeline/TimelineHolidayAlmanac.vue')
    const html = await renderComponent(component, {
      holidays: [
        { type: 'official', shortName: 'Holiday A', dateStr: '2026-05-01', daysUntil: 0, slogan: 'Today' },
        { type: 'traditional', shortName: 'Holiday B', dateStr: '2026-05-05', daysUntil: 4, slogan: 'Soon' },
      ],
      countdownLabel: (daysUntil) => (daysUntil === 0 ? 'TODAY' : `${daysUntil}d`),
      holidayIconClass: (holiday) => `icon-${holiday.shortName.toLowerCase().replace(/\s+/g, '-')}`,
    })

    expect(html).toContain('Holiday A')
    expect(html).toContain('Holiday B')
    expect(html).toContain('stamp-card--official')
    expect(html).toContain('stamp-countdown--today')
    expect(html).toContain('icon-holiday-a')
    expect(html).toContain('TODAY')
  })
})
