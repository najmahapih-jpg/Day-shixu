const { computed, ref } = require('vue')
const { useTimelineLaneView } = require('@/composables/useTimelineLaneView')

function createHabit(overrides = {}) {
  return {
    _id: 'habit-1',
    name: '喝水',
    reminderTime: '09:00',
    type: 'boolean',
    targetValue: 1,
    unit: '',
    ...overrides,
  }
}

describe('useTimelineLaneView', () => {
  test('detects completed and missed states from timeline view inputs', () => {
    const completedIds = ref(new Set(['habit-1']))
    const view = useTimelineLaneView({
      isToday: ref(true),
      nowMinuteOfDay: ref(620),
      anchoredHabits: ref([]),
      todayCheckIns: computed(() => ({
        has: (habitId) => completedIds.value.has(habitId),
      })),
      dyingHabitIds: ref([]),
    })

    const completedHabit = createHabit({ _id: 'habit-1', reminderTime: '09:00' })
    const missedHabit = createHabit({ _id: 'habit-2', reminderTime: '09:00' })

    expect(view.isHabitCompleted(completedHabit)).toBe(true)
    expect(view.isHabitMissed(completedHabit)).toBe(false)
    expect(view.isHabitMissed(missedHabit)).toBe(true)
  })

  test('groups habits by hour and keeps dying completed tickets visible in the lane', () => {
    const anchoredHabits = ref([
      createHabit({ _id: 'habit-1', reminderTime: '09:15' }),
      createHabit({ _id: 'habit-2', reminderTime: '09:45' }),
      createHabit({ _id: 'habit-3', reminderTime: '10:00' }),
    ])
    const completedIds = ref(new Set(['habit-2']))
    const view = useTimelineLaneView({
      isToday: ref(true),
      nowMinuteOfDay: ref(500),
      anchoredHabits,
      todayCheckIns: computed(() => ({
        has: (habitId) => completedIds.value.has(habitId),
      })),
      dyingHabitIds: ref(['habit-2']),
    })

    expect(view.getHabitsForHour(9).map((habit) => habit._id)).toEqual(['habit-1', 'habit-2'])
    expect(view.getHabitsForHour(10).map((habit) => habit._id)).toEqual(['habit-3'])
  })

  test('resolves nextUpcomingHabit and habit type labels for boolean/counter/timer tickets', () => {
    const anchoredHabits = ref([
      createHabit({ _id: 'habit-1', name: '喝水', reminderTime: '09:30', type: 'boolean' }),
      createHabit({ _id: 'habit-2', name: '拉伸', reminderTime: '10:00', type: 'counter', targetValue: 3, unit: '次' }),
      createHabit({ _id: 'habit-3', name: '冥想', reminderTime: '11:00', type: 'timer', targetValue: 1800 }),
    ])

    const view = useTimelineLaneView({
      isToday: ref(true),
      nowMinuteOfDay: ref(570),
      anchoredHabits,
      todayCheckIns: ref({ has: () => false }),
      dyingHabitIds: ref([]),
    })

    expect(view.nextUpcomingHabit.value?._id).toBe('habit-2')
    expect(view.getHabitTypeLabel(anchoredHabits.value[0])).toBe('单次打卡')
    expect(view.getHabitTypeLabel(anchoredHabits.value[1])).toBe('3次')
    expect(view.getHabitTypeLabel(anchoredHabits.value[2])).toBe('30 分钟')
  })
})
