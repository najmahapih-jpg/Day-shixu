const { computed, ref } = require('vue')
const { useTimelineModeUiShell } = require('@/composables/useTimelineModeUiShell')

describe('useTimelineModeUiShell', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('derives date slide class from direction and exposes fade toggles', () => {
    const direction = ref('none')
    const shell = useTimelineModeUiShell({
      dateDirection: computed(() => direction.value),
      hours: ref([]),
      getHabitsForHour: () => [],
      ticketReveal: { reset: jest.fn(), reveal: jest.fn() },
    })

    expect(shell.dateSlideClass.value).toBe('')

    direction.value = 'left'
    expect(shell.dateSlideClass.value).toBe('tl-slide-left')

    shell.beginDateFade()
    expect(shell.dateFading.value).toBe(true)
    expect(shell.blocksEntered.value).toBe(false)

    shell.finishDateFade()
    expect(shell.dateFading.value).toBe(false)
  })

  test('triggerBlocksEntry resets reveal state and progressively reveals visible hour tickets', () => {
    const reset = jest.fn()
    const reveal = jest.fn()
    const shell = useTimelineModeUiShell({
      dateDirection: ref('none'),
      hours: ref([8, 9, 10]),
      getHabitsForHour: (hour) => {
        if (hour === 9) return [{ _id: 'habit-1' }, { _id: 'habit-2' }]
        if (hour === 10) return [{ _id: 'habit-3' }]
        return []
      },
      ticketReveal: { reset, reveal },
      entryStartDelayMs: 80,
      groupRevealDelayMs: 120,
      itemRevealDelayMs: 60,
    })

    shell.triggerBlocksEntry()

    expect(reset).toHaveBeenCalledTimes(1)
    expect(shell.blocksEntered.value).toBe(false)

    jest.advanceTimersByTime(79)
    expect(reveal).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(shell.blocksEntered.value).toBe(true)

    jest.advanceTimersByTime(1)
    expect(reveal).toHaveBeenNthCalledWith(1, 90)

    jest.advanceTimersByTime(60)
    expect(reveal).toHaveBeenNthCalledWith(2, 91)

    jest.advanceTimersByTime(60)
    expect(reveal).toHaveBeenNthCalledWith(3, 100)
  })

  test('resetTimelineModeUiShell clears pending timers and state before reveal finishes', () => {
    const reveal = jest.fn()
    const shell = useTimelineModeUiShell({
      dateDirection: ref('right'),
      hours: ref([9]),
      getHabitsForHour: () => [{ _id: 'habit-1' }],
      ticketReveal: { reset: jest.fn(), reveal },
    })

    shell.beginDateFade()
    shell.triggerBlocksEntry()
    shell.resetTimelineModeUiShell()

    jest.advanceTimersByTime(5000)

    expect(shell.dateFading.value).toBe(false)
    expect(shell.blocksEntered.value).toBe(false)
    expect(reveal).not.toHaveBeenCalled()
  })
})
