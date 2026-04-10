const { nextTick, ref } = require('vue')
const { useTimelineLayoutShell } = require('@/composables/useTimelineLayoutShell')

describe('useTimelineLayoutShell', () => {
  test('calcScrollHeight computes timeline scroll height from current layout inputs', () => {
    const shell = useTimelineLayoutShell({
      statusBarHeight: ref(20),
      viewMode: ref('timeline'),
      loading: ref(false),
      dayTotalCount: ref(3),
      tabbarHeightRpx: 110,
      timelineStatsBarRpx: 96,
      timelineBottomGapRpx: 24,
      getWindowInfo: () => ({
        windowWidth: 375,
        windowHeight: 800,
        safeAreaInsets: { bottom: 10 },
      }),
    })

    shell.calcScrollHeight()

    expect(shell.scrollHeight.value).toBe(477)
  })

  test('watch-driven recalculation responds to timeline layout state changes', async () => {
    const viewMode = ref('timeline')
    const loading = ref(true)
    const dayTotalCount = ref(0)

    const shell = useTimelineLayoutShell({
      statusBarHeight: ref(20),
      viewMode,
      loading,
      dayTotalCount,
      tabbarHeightRpx: 110,
      timelineStatsBarRpx: 96,
      timelineBottomGapRpx: 24,
      getWindowInfo: () => ({
        windowWidth: 375,
        windowHeight: 800,
        safeAreaInsets: { bottom: 10 },
      }),
    })

    loading.value = false
    dayTotalCount.value = 2
    await nextTick()

    expect(shell.scrollHeight.value).toBe(477)

    viewMode.value = 'calendar'
    dayTotalCount.value = 0
    shell.scrollHeight.value = 123
    await nextTick()

    expect(shell.scrollHeight.value).toBe(123)
  })

  test('fallback and reset keep layout state stable under invalid window info', () => {
    const shell = useTimelineLayoutShell({
      statusBarHeight: ref(20),
      viewMode: ref('timeline'),
      loading: ref(false),
      dayTotalCount: ref(2),
      tabbarHeightRpx: 110,
      timelineStatsBarRpx: 96,
      timelineBottomGapRpx: 24,
      getWindowInfo: () => {
        throw new Error('unsupported env')
      },
    })

    shell.calcScrollHeight()
    expect(shell.scrollHeight.value).toBe(500)

    shell.scrollHeight.value = 320
    shell.resetLayoutShell()
    expect(shell.scrollHeight.value).toBe(500)
  })
})
