const { useTimelineLaneInteractionShell } = require('@/composables/useTimelineLaneInteractionShell')

describe('useTimelineLaneInteractionShell', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('tracks short-lived piano key press and checking state', () => {
    const shell = useTimelineLaneInteractionShell()

    shell.startPianoPress('habit-1')
    shell.startChecking('habit-1')

    expect(shell.pressingKeyId.value).toBe('habit-1')
    expect(shell.isChecking.value).toBe('habit-1')

    shell.finishChecking('habit-1')
    expect(shell.isChecking.value).toBe(null)

    jest.advanceTimersByTime(300)
    expect(shell.pressingKeyId.value).toBe(null)
  })

  test('scheduleTicketFadeOut moves a ticket through just-completed, dying, fading, then cleanup', () => {
    const shell = useTimelineLaneInteractionShell()

    shell.scheduleTicketFadeOut('habit-2')

    expect(shell.justCompletedId.value).toBe('habit-2')
    expect(shell.dyingHabitIds.value).toEqual(['habit-2'])
    expect(shell.fadingHabitIds.value).toEqual([])

    jest.advanceTimersByTime(800)
    expect(shell.justCompletedId.value).toBe(null)
    expect(shell.dyingHabitIds.value).toEqual(['habit-2'])

    jest.advanceTimersByTime(1200)
    expect(shell.fadingHabitIds.value).toEqual(['habit-2'])

    jest.advanceTimersByTime(500)
    expect(shell.dyingHabitIds.value).toEqual([])
    expect(shell.fadingHabitIds.value).toEqual([])
    expect(shell.justCompletedId.value).toBe(null)
  })

  test('resetTransientHabitState and clearLaneTicketTransition cancel pending timers safely', () => {
    const shell = useTimelineLaneInteractionShell()

    shell.scheduleTicketFadeOut('habit-3')
    shell.clearLaneTicketTransition('habit-3')
    jest.advanceTimersByTime(3000)

    expect(shell.dyingHabitIds.value).toEqual([])
    expect(shell.fadingHabitIds.value).toEqual([])
    expect(shell.justCompletedId.value).toBe(null)

    shell.scheduleTicketFadeOut('habit-4')
    shell.startChecking('habit-4')
    shell.resetTransientHabitState()
    jest.advanceTimersByTime(3000)

    expect(shell.isChecking.value).toBe(null)
    expect(shell.dyingHabitIds.value).toEqual([])
    expect(shell.fadingHabitIds.value).toEqual([])
    expect(shell.justCompletedId.value).toBe(null)
  })
})
