const { useHomeKineticYOverlay } = require('@/composables/useHomeKineticYOverlay')

describe('useHomeKineticYOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('arms the first-visit salute and reveals it after 500ms', () => {
    const markFirstVisitSeen = jest.fn()
    const overlay = useHomeKineticYOverlay({
      checkFirstVisit: () => true,
      markFirstVisitSeen,
    })

    expect(overlay.checkFirstVisit()).toBe(true)
    expect(overlay.shouldReveal.value).toBe(true)
    expect(overlay.scheduleAutoReveal()).toBe(true)
    expect(overlay.visible.value).toBe(false)

    jest.advanceTimersByTime(499)
    expect(overlay.visible.value).toBe(false)

    jest.advanceTimersByTime(1)
    expect(overlay.visible.value).toBe(true)
    expect(markFirstVisitSeen).toHaveBeenCalledTimes(1)
  })

  test('does not schedule the salute for returning visitors', () => {
    const overlay = useHomeKineticYOverlay({
      checkFirstVisit: () => false,
      markFirstVisitSeen: jest.fn(),
    })

    expect(overlay.checkFirstVisit()).toBe(false)
    expect(overlay.scheduleAutoReveal()).toBe(false)

    jest.advanceTimersByTime(500)
    expect(overlay.visible.value).toBe(false)
  })

  test('clears a pending reveal without opening the overlay', () => {
    const markFirstVisitSeen = jest.fn()
    const overlay = useHomeKineticYOverlay({
      checkFirstVisit: () => true,
      markFirstVisitSeen,
    })

    overlay.checkFirstVisit()
    overlay.scheduleAutoReveal()
    overlay.clearRevealTimer()

    jest.advanceTimersByTime(500)
    expect(overlay.visible.value).toBe(false)
    expect(markFirstVisitSeen).not.toHaveBeenCalled()
  })

  test('allows the home replay link to open the overlay immediately and cancel the pending timer', () => {
    const markFirstVisitSeen = jest.fn()
    const overlay = useHomeKineticYOverlay({
      checkFirstVisit: () => true,
      markFirstVisitSeen,
    })

    overlay.checkFirstVisit()
    overlay.scheduleAutoReveal()
    overlay.openOverlay()

    expect(overlay.visible.value).toBe(true)
    expect(overlay.shouldReveal.value).toBe(false)
    expect(markFirstVisitSeen).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(500)
    expect(markFirstVisitSeen).toHaveBeenCalledTimes(1)
  })
})
