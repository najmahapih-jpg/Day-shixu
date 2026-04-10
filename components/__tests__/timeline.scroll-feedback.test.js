const { ref } = require('vue')
const { useTimelineScrollFeedback } = require('@/composables/useTimelineScrollFeedback')

describe('useTimelineScrollFeedback', () => {
  test('derives progress, velocity, and sticky period label from scroll position', () => {
    const onParallaxUpdate = jest.fn()
    const feedback = useTimelineScrollFeedback({
      scrollHeight: ref(500),
      startHour: 0,
      endHour: 24,
      hourHeightRpx: 120,
      periodLabels: {
        0: '凌晨',
        6: '清晨',
        9: '上午',
        12: '午间',
      },
      onParallaxUpdate,
      getWindowWidth: () => 375,
    })

    feedback.handleScroll({ detail: { scrollTop: 900 } })

    expect(onParallaxUpdate).toHaveBeenCalledWith(900)
    expect(feedback.scrollVelocity.value).toBe(900)
    expect(feedback.scrollProgress.value).toBeCloseTo(900 / (1440 - 500), 6)
    expect(feedback.currentPeriodLabel.value).toBe('午间')
  })

  test('clamps progress at one and keeps period label stable under large scroll offsets', () => {
    const feedback = useTimelineScrollFeedback({
      scrollHeight: ref(500),
      startHour: 0,
      endHour: 24,
      hourHeightRpx: 120,
      periodLabels: {
        0: '凌晨',
        18: '傍晚',
        21: '夜间',
      },
      getWindowWidth: () => 375,
    })

    feedback.handleScroll({ detail: { scrollTop: 5000 } })

    expect(feedback.scrollProgress.value).toBe(1)
    expect(feedback.currentPeriodLabel.value).toBe('夜间')
  })

  test('resetScrollFeedback clears scroll-linked display state', () => {
    const feedback = useTimelineScrollFeedback({
      scrollHeight: ref(500),
      startHour: 0,
      endHour: 24,
      hourHeightRpx: 120,
      periodLabels: { 0: '凌晨' },
      getWindowWidth: () => 375,
    })

    feedback.handleScroll({ detail: { scrollTop: 300 } })
    feedback.resetScrollFeedback()

    expect(feedback.scrollProgress.value).toBe(0)
    expect(feedback.scrollVelocity.value).toBe(0)
    expect(feedback.currentPeriodLabel.value).toBe('')
  })
})
