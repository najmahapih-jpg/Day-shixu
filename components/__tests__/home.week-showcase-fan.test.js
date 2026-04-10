const { computed, ref } = require('vue')
const { useHomeWeekShowcaseFan } = require('@/composables/useHomeWeekShowcaseFan')

describe('useHomeWeekShowcaseFan', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('initial focus snaps to supplied today index and card styles are generated', () => {
    const hapticLight = jest.fn()
    const cardCount = computed(() => 7)
    const fan = useHomeWeekShowcaseFan({
      cardCount,
      getTodayIndex: () => 3,
      hapticLight,
    })

    expect(fan.weekFocusIndex.value).toBe(3)
    expect(fan.weekCardStyles.value).toHaveLength(7)
    expect(fan.weekCardStyles.value[3].transform).toContain('translateY(-16rpx)')
  })

  test('card tap focuses the chosen card and auto-returns to today after idle timeout', () => {
    const hapticLight = jest.fn()
    const fan = useHomeWeekShowcaseFan({
      cardCount: ref(7),
      getTodayIndex: () => 2,
      hapticLight,
    })

    fan.onCardTap(5)
    expect(hapticLight).toHaveBeenCalledTimes(1)
    expect(fan.weekFocusIndex.value).toBe(5)

    jest.advanceTimersByTime(5000)
    expect(fan.weekFocusIndex.value).toBe(2)
  })

  test('touch drag clamps, snaps, and keeps focus within valid card range', () => {
    const hapticLight = jest.fn()
    const fan = useHomeWeekShowcaseFan({
      cardCount: ref(7),
      getTodayIndex: () => 1,
      hapticLight,
    })

    fan.onFanTouchStart({ touches: [{ clientX: 100 }] })
    fan.onFanTouchMove({ touches: [{ clientX: 420 }] })
    fan.onFanTouchEnd()

    expect(hapticLight).toHaveBeenCalledTimes(1)
    expect(fan.weekFocusIndex.value).toBeGreaterThanOrEqual(0)
    expect(fan.weekFocusIndex.value).toBeLessThanOrEqual(6)
  })
})
