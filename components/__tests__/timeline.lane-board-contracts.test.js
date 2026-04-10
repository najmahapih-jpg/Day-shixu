const { makeStub, loadComponent, renderComponent, getEmitNames, getSetupBindings } = require('./helpers/vue-test-helpers')

jest.mock('@/components/base/HfIcon.vue', () => ({
  __esModule: true,
  default: makeStub('HfIcon'),
}))

describe('timeline lane board split contracts', () => {
  test('TimelineLaneTicket renders core ticket fields and preserves emit contracts', async () => {
    const component = loadComponent('@/components/timeline/TimelineLaneTicket.vue')
    const habit = {
      _id: 'habit-1',
      name: '喝水',
      icon: '',
      category: 'exercise',
    }

    const html = await renderComponent(component, {
      habit,
      ticketIndex: 1,
      revealIndex: 11,
      revealStyle: { opacity: '1' },
      isCompleted: false,
      isMissed: true,
      isChecking: 'habit-1',
      isFading: false,
      justCompleted: true,
      habitTypeLabel: '单次打卡',
      pokerSuit: '♦',
    })

    expect(html).toContain('喝水')
    expect(html).toContain('单次打卡')
    expect(html).toContain('Forte')
    expect(html).toContain('♦')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['tap', 'open-detail', 'delete']))

    const emitted = []
    const bindings = getSetupBindings(component, {
      habit,
      ticketIndex: 0,
      revealIndex: 0,
      revealStyle: {},
      isCompleted: false,
      isMissed: false,
      isChecking: null,
      isFading: false,
      justCompleted: false,
      habitTypeLabel: '单次打卡',
      pokerSuit: '♣',
    }, (name, payload) => emitted.push([name, payload]))
    bindings.handleTap()
    bindings.handleOpenDetail()
    bindings.handleDelete()
    expect(emitted).toEqual([
      ['tap', habit],
      ['open-detail', habit],
      ['delete', 'habit-1'],
    ])
  })

  test('TimelineLaneBoard renders lane metadata, dealer overflow, and now-line bubble', async () => {
    const component = loadComponent('@/components/timeline/TimelineLaneBoard.vue')
    const habits = [
      { _id: 'habit-1', name: '喝水', icon: '', category: 'exercise' },
      { _id: 'habit-2', name: '拉伸', icon: '', category: 'sleep' },
      { _id: 'habit-3', name: '冥想', icon: '', category: 'health' },
      { _id: 'habit-4', name: '阅读', icon: '', category: 'learning' },
    ]

    const html = await renderComponent(component, {
      dateSlideClass: 'tl-slide-left',
      dateFading: false,
      timelineRenderHeightRpx: 600,
      hourHeight: 120,
      currentPeriodLabel: '上午',
      hours: [9],
      periodLabels: { 9: '上午' },
      isToday: true,
      showGhostWatermark: true,
      showNowLine: true,
      nowLineTop: 240,
      nowTimeText: '09:30',
      nextUpcomingHabitName: '冥想',
      getHabitsForHour: () => habits,
      isCurrentHour: () => true,
      getPokerColorClass: () => 'suit-diamonds',
      getPokerSuit: () => '♦',
      padHour: () => '09',
      getRevealStyle: () => ({ opacity: '1' }),
      isHabitCompleted: (habit) => habit._id === 'habit-1',
      isHabitMissed: (habit) => habit._id === 'habit-2',
      isChecking: 'habit-3',
      justCompletedId: 'habit-1',
      fadingHabitIds: ['habit-2'],
      getHabitTypeLabel: () => '单次打卡',
    })

    expect(html).toContain('上午')
    expect(html).toContain('09')
    expect(html).toContain('接下来 · 冥想')
    expect(html).toContain('Silence')
    expect(html).toContain('+1')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['ticket-tap', 'open-habit-detail', 'delete-ticket']))

    const emitted = []
    const bindings = getSetupBindings(component, {
      dateSlideClass: '',
      dateFading: false,
      timelineRenderHeightRpx: 600,
      hourHeight: 120,
      currentPeriodLabel: '',
      hours: [],
      periodLabels: {},
      isToday: false,
      showGhostWatermark: false,
      showNowLine: false,
      nowLineTop: 0,
      nowTimeText: '',
      nextUpcomingHabitName: null,
      getHabitsForHour: () => [],
      isCurrentHour: () => false,
      getPokerColorClass: () => '',
      getPokerSuit: () => '♣',
      padHour: () => '00',
      getRevealStyle: () => ({}),
      isHabitCompleted: () => false,
      isHabitMissed: () => false,
      isChecking: null,
      justCompletedId: null,
      fadingHabitIds: [],
      getHabitTypeLabel: () => '',
    }, (name, payload) => emitted.push([name, payload]))
    bindings.handleTicketTap(habits[0])
    bindings.handleOpenHabitDetail(habits[0])
    bindings.handleDeleteTicket('habit-1')
    expect(emitted).toEqual([
      ['ticket-tap', habits[0]],
      ['open-habit-detail', habits[0]],
      ['delete-ticket', 'habit-1'],
    ])
  })
})
