const { computed, ref } = require('vue')
const { useHomeHabitUiState } = require('@/composables/useHomeHabitUiState')

function createHabit(id) {
  return { _id: id }
}

describe('useHomeHabitUiState', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('keeps checked habit in pending list during transition, then settles into completed list', () => {
    const todayHabits = ref([createHabit('habit-1'), createHabit('habit-2')])
    const checkedIds = ref(new Set())
    const ui = useHomeHabitUiState({
      todayHabits,
      todayCheckIns: computed(() => checkedIds.value),
      reduceMotion: ref(false),
    })

    ui.startCheckTransition('habit-1')
    checkedIds.value = new Set(['habit-1'])

    expect(ui.displayPendingHabits.value.map(habit => habit._id)).toEqual(['habit-1', 'habit-2'])
    expect(ui.displayCompletedHabits.value).toEqual([])

    jest.advanceTimersByTime(120)
    expect(ui.fadingHabitIds.value).toEqual(['habit-1'])

    ui.settleCheckTransition('habit-1')
    jest.advanceTimersByTime(320)

    expect(ui.fadingHabitIds.value).toEqual([])
    expect(ui.displayPendingHabits.value.map(habit => habit._id)).toEqual(['habit-2'])
    expect(ui.displayCompletedHabits.value.map(habit => habit._id)).toEqual(['habit-1'])
  })

  test('warning state auto clears and resetAllHabitUi cancels in-flight timers', () => {
    const ui = useHomeHabitUiState({
      todayHabits: ref([createHabit('habit-1')]),
      todayCheckIns: ref(new Set()),
      reduceMotion: ref(false),
    })

    ui.markHabitWarning('habit-1')
    expect(ui.warningHabitIds.value).toEqual(['habit-1'])

    jest.advanceTimersByTime(320)
    expect(ui.warningHabitIds.value).toEqual([])

    ui.startCheckTransition('habit-1')
    ui.markHabitWarning('habit-1')
    ui.resetAllHabitUi()
    jest.advanceTimersByTime(1000)

    expect(ui.fadingHabitIds.value).toEqual([])
    expect(ui.warningHabitIds.value).toEqual([])
    expect(ui.displayPendingHabits.value.map(habit => habit._id)).toEqual(['habit-1'])
  })

  test('showCompleted remains a pure local toggle state', () => {
    const ui = useHomeHabitUiState({
      todayHabits: ref([]),
      todayCheckIns: ref(new Set()),
      reduceMotion: ref(true),
    })

    expect(ui.showCompleted.value).toBe(false)
    ui.toggleCompleted()
    expect(ui.showCompleted.value).toBe(true)
  })
})
