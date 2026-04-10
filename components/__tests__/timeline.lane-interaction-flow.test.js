const { computed, ref } = require('vue')
const { useTimelineLaneInteractionFlow } = require('@/composables/useTimelineLaneInteractionFlow')

function createHabit(overrides = {}) {
  return {
    _id: 'habit-1',
    name: '喝水',
    type: 'boolean',
    targetValue: 1,
    ...overrides,
  }
}

describe('useTimelineLaneInteractionFlow', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('piano key tap drives press state, loading shell, business call, and just-completed success chain', async () => {
    const completedIds = ref(new Set())
    const isChecking = ref(null)
    const startPianoPress = jest.fn()
    const startChecking = jest.fn((habitId) => { isChecking.value = habitId })
    const finishChecking = jest.fn(() => { isChecking.value = null })
    const flashJustCompleted = jest.fn()
    const clearLaneTicketTransition = jest.fn()
    const scheduleTicketFadeOut = jest.fn()
    const hapticLight = jest.fn()
    const hapticSuccess = jest.fn()
    const hapticMedium = jest.fn()
    const hapticCelebration = jest.fn()
    const handleCheck = jest.fn(async (habitId) => {
      completedIds.value = new Set([...completedIds.value, habitId])
      return true
    })

    const flow = useTimelineLaneInteractionFlow({
      todayHabits: ref([createHabit()]),
      isChecking: computed(() => isChecking.value),
      isHabitCompleted: (habit) => !!habit._id && completedIds.value.has(habit._id),
      handleCheck,
      startPianoPress,
      startChecking,
      finishChecking,
      flashJustCompleted,
      clearLaneTicketTransition,
      scheduleTicketFadeOut,
      hapticLight,
      hapticMedium,
      hapticSuccess,
      hapticCelebration,
      interactionDelayMs: 600,
      bravuraDelayMs: 2500,
    })

    flow.onPianoKeyTap(createHabit())

    expect(hapticLight).toHaveBeenCalledTimes(1)
    expect(startPianoPress).toHaveBeenCalledWith('habit-1')
    expect(startChecking).toHaveBeenCalledWith('habit-1')

    await jest.advanceTimersByTimeAsync(600)

    expect(finishChecking).toHaveBeenCalledWith('habit-1')
    expect(handleCheck).toHaveBeenCalledWith('habit-1', 1)
    expect(flashJustCompleted).toHaveBeenCalledWith('habit-1')
    expect(hapticSuccess).toHaveBeenCalledTimes(1)
    expect(scheduleTicketFadeOut).not.toHaveBeenCalled()
    expect(hapticCelebration).toHaveBeenCalledTimes(1)
    expect(flow.showBravura.value).toBe(false)

    await jest.advanceTimersByTimeAsync(2500)
    expect(flow.showBravura.value).toBe(true)
  })

  test('ticket tap success uses fade-out shell path and completed tickets stay disabled', async () => {
    const completedIds = ref(new Set(['habit-done']))
    const isChecking = ref(null)
    const handleCheck = jest.fn(async () => true)
    const scheduleTicketFadeOut = jest.fn()
    const flow = useTimelineLaneInteractionFlow({
      todayHabits: ref([createHabit({ _id: 'habit-2', type: 'counter', targetValue: 3 })]),
      isChecking: computed(() => isChecking.value),
      isHabitCompleted: (habit) => !!habit._id && completedIds.value.has(habit._id),
      handleCheck,
      startPianoPress: jest.fn(),
      startChecking: jest.fn((habitId) => { isChecking.value = habitId }),
      finishChecking: jest.fn(() => { isChecking.value = null }),
      flashJustCompleted: jest.fn(),
      clearLaneTicketTransition: jest.fn(),
      scheduleTicketFadeOut,
      hapticLight: jest.fn(),
      hapticMedium: jest.fn(),
      hapticSuccess: jest.fn(),
      hapticCelebration: jest.fn(),
      interactionDelayMs: 600,
      bravuraDelayMs: 2500,
    })

    flow.onTicketTap(createHabit({ _id: 'habit-done' }))
    expect(handleCheck).not.toHaveBeenCalled()

    flow.onTicketTap(createHabit({ _id: 'habit-2', type: 'counter', targetValue: 3 }))
    await jest.advanceTimersByTimeAsync(600)

    expect(handleCheck).toHaveBeenCalledWith('habit-2', 3)
    expect(scheduleTicketFadeOut).toHaveBeenCalledWith('habit-2')
  })

  test('failed business calls clear transient shell state and reset cancels pending timers', async () => {
    const isChecking = ref(null)
    const clearLaneTicketTransition = jest.fn()
    const flow = useTimelineLaneInteractionFlow({
      todayHabits: ref([createHabit()]),
      isChecking: computed(() => isChecking.value),
      isHabitCompleted: () => false,
      handleCheck: jest.fn(async () => false),
      startPianoPress: jest.fn(),
      startChecking: jest.fn((habitId) => { isChecking.value = habitId }),
      finishChecking: jest.fn(() => { isChecking.value = null }),
      flashJustCompleted: jest.fn(),
      clearLaneTicketTransition,
      scheduleTicketFadeOut: jest.fn(),
      hapticLight: jest.fn(),
      hapticMedium: jest.fn(),
      hapticSuccess: jest.fn(),
      hapticCelebration: jest.fn(),
      interactionDelayMs: 600,
      bravuraDelayMs: 2500,
    })

    flow.onTicketTap(createHabit())
    await jest.advanceTimersByTimeAsync(600)
    expect(clearLaneTicketTransition).toHaveBeenCalledWith('habit-1')

    flow.onPianoKeyTap(createHabit())
    flow.resetLaneInteractionFlow()
    await jest.advanceTimersByTimeAsync(5000)
    expect(flow.showBravura.value).toBe(false)
  })
})
