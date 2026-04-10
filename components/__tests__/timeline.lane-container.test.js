const { computed, ref } = require('vue')
const { useTimelineLaneContainer } = require('@/composables/useTimelineLaneContainer')

function createHabit(overrides = {}) {
  return {
    _id: 'habit-1',
    name: '喝水',
    reminderTime: '',
    ...overrides,
  }
}

describe('useTimelineLaneContainer', () => {
  test('splits floating and anchored habits and derives completed ids from today check-ins', () => {
    const todayHabits = ref([
      createHabit({ _id: 'habit-1', reminderTime: '' }),
      createHabit({ _id: 'habit-2', reminderTime: '09:00' }),
      createHabit({ _id: 'habit-3', reminderTime: '21:00' }),
    ])
    const container = useTimelineLaneContainer({
      todayHabits,
      completedHabits: ref([]),
      todayCheckIns: computed(() => new Map([
        ['habit-2', { value: 1 }],
        ['habit-3', { value: 1 }],
      ])),
      dyingHabitIds: ref([]),
    })

    expect(container.floatingHabits.value.map((habit) => habit._id)).toEqual(['habit-1'])
    expect(container.anchoredHabits.value.map((habit) => habit._id)).toEqual(['habit-2', 'habit-3'])
    expect(container.completedHabitIds.value).toEqual(['habit-2', 'habit-3'])
  })

  test('filters coda habits by anchored status and dying pool', () => {
    const container = useTimelineLaneContainer({
      todayHabits: ref([]),
      completedHabits: ref([
        createHabit({ _id: 'habit-1', reminderTime: '08:00' }),
        createHabit({ _id: 'habit-2', reminderTime: '' }),
        createHabit({ _id: 'habit-3', reminderTime: '22:00' }),
      ]),
      todayCheckIns: ref(new Map()),
      dyingHabitIds: ref(['habit-3']),
    })

    expect(container.codaHabits.value.map((habit) => habit._id)).toEqual(['habit-1'])
  })

  test('toggleCoda only controls the local container shell state', () => {
    const container = useTimelineLaneContainer({
      todayHabits: ref([]),
      completedHabits: ref([]),
      todayCheckIns: ref(new Map()),
      dyingHabitIds: ref([]),
    })

    expect(container.codaOpen.value).toBe(false)
    container.toggleCoda()
    expect(container.codaOpen.value).toBe(true)
    container.toggleCoda()
    expect(container.codaOpen.value).toBe(false)
  })
})
