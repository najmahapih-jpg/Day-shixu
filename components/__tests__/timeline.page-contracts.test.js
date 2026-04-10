const { makeStub, loadComponent, renderComponent, getEmitNames, getSetupBindings } = require('./helpers/vue-test-helpers')

jest.mock('@/components/base/HfIcon.vue', () => ({
  __esModule: true,
  default: makeStub('HfIcon'),
}))

describe('timeline phase-one split regression contracts', () => {
  test('TimelineTopBar renders view controls and keeps top-level emits contract', async () => {
    const component = loadComponent('@/components/timeline/TimelineTopBar.vue')
    const html = await renderComponent(component, {
      statusBarHeight: 20,
      isToday: false,
      viewMode: 'timeline',
    })

    expect(html).toContain('时间轴')
    expect(html).toContain('日历')
    expect(html).toContain('回到今天')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['go-today', 'switch-mode']))
  })

  test('TimelineDateStrip renders month/today/selected state and emits select-date', async () => {
    const component = loadComponent('@/components/timeline/TimelineDateStrip.vue')
    const html = await renderComponent(component, {
      monthDisplay: '4月',
      selectedDate: '2026-04-09',
      selectedDateAnchor: 'd-2026-04-09',
      totalActiveHabits: 4,
      showNowBadge: true,
      nowTimeText: '09:30',
      getArcStyle: () => ({}),
      dateList: [
        { date: '2026-04-09', day: 9, weekday: '四', isToday: true, checkInCount: 2, month: 4 },
        { date: '2026-04-10', day: 10, weekday: '五', isToday: false, checkInCount: 0, month: 4 },
      ],
    })

    expect(html).toContain('4月')
    expect(html).toContain('北京时间（UTC+8） 09:30')
    expect(html).toContain('is-today')
    expect(html).toContain('is-selected')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['select-date']))

    const emitted = []
    const bindings = getSetupBindings(component, {
      monthDisplay: '4月',
      selectedDate: '2026-04-09',
      selectedDateAnchor: 'd-2026-04-09',
      totalActiveHabits: 4,
      showNowBadge: false,
      nowTimeText: '',
      getArcStyle: () => ({}),
      dateList: [],
    }, (name, payload) => emitted.push([name, payload]))
    bindings.handleSelect('2026-04-10')
    expect(emitted).toEqual([['select-date', '2026-04-10']])
  })

  test('TimelineRubatoStrip renders typical data and preserves tap/longpress contracts', async () => {
    const component = loadComponent('@/components/timeline/TimelineRubatoStrip.vue')
    const html = await renderComponent(component, {
      pressingKeyId: null,
      isChecking: null,
      justCompletedId: 'habit-1',
      completedIds: ['habit-1'],
      habits: [
        { _id: 'habit-1', name: '喝水', icon: '', reminderTime: '', type: 'boolean', targetValue: 1 },
        { _id: 'habit-2', name: '冥想', icon: '', reminderTime: '', type: 'boolean', targetValue: 1 },
      ],
    })

    expect(html).toContain('Rubato')
    expect(html).toContain('喝水')
    expect(html).toContain('冥想')
    expect(html).toContain('piano-key--black')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['tap-habit', 'longpress-habit']))

    const emitted = []
    const bindings = getSetupBindings(component, {
      pressingKeyId: null,
      isChecking: null,
      justCompletedId: null,
      completedIds: [],
      habits: [],
    }, (name, payload) => emitted.push([name, payload]))
    bindings.handleLongpress('habit-2')
    expect(emitted).toEqual([['longpress-habit', 'habit-2']])
  })

  test('TimelineCodaDesk renders anthology data and keeps toggle contract', async () => {
    const component = loadComponent('@/components/timeline/TimelineCodaDesk.vue')
    const html = await renderComponent(component, {
      joinedDays: 12,
      displayNickName: 'Alice',
      codaHabits: [
        { _id: 'habit-1', name: '喝水', reminderTime: '09:00' },
        { _id: 'habit-2', name: '拉伸', reminderTime: '' },
      ],
      codaOpen: true,
      showBravura: true,
    })

    expect(html).toContain('Opus. 12')
    expect(html).toContain('Alice')
    expect(html).toContain('Anthology · 2')
    expect(html).toContain('Bravura!')
    expect(html).toContain('喝水')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['toggle-coda']))
  })
})
