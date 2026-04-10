const { computed, ref } = require('vue')
const { useHomeStarMapDisplay } = require('@/composables/useHomeStarMapDisplay')

function createHabit(overrides = {}) {
  return {
    name: '喝水',
    streakCurrent: 0,
    totalCompletions: 0,
    updatedAt: '',
    ...overrides,
  }
}

describe('useHomeStarMapDisplay', () => {
  test('returns stable fallback values when ai insight and active habits are absent', () => {
    const display = useHomeStarMapDisplay({
      aiInsight: ref(null),
      activeHabits: ref([]),
    })

    expect(display.aiInsightExists.value).toBe(false)
    expect(display.displayScore.value).toBe('--')
    expect(display.displayHighlightCount.value).toBe('--')
    expect(display.displayTopHabit.value).toBe('--')
  })

  test('derives score, highlight count, and ai insight presence from cached insight', () => {
    const aiInsight = ref({
      generatedAt: '2026-04-10T00:00:00.000Z',
      summary: 'summary',
      recommendations: ['补水', '拉伸', '冥想'],
      slogans: ['继续保持'],
      trend: {
        thisWeekRate: 88,
        lastWeekRate: 72,
        delta: 16,
        direction: 'up',
        analysis: 'analysis',
        bestDay: 'fri',
      },
      source: 'rule-engine',
      model: 'local',
    })

    const display = useHomeStarMapDisplay({
      aiInsight,
      activeHabits: ref([]),
    })

    expect(display.aiInsightExists.value).toBe(true)
    expect(display.displayScore.value).toBe(88)
    expect(display.displayHighlightCount.value).toBe(3)
  })

  test('ranks top habit by streak, then completions, then updatedAt recency', () => {
    const activeHabits = ref([
      createHabit({
        name: '早睡',
        streakCurrent: 3,
        totalCompletions: 20,
        updatedAt: '2026-04-09T09:00:00.000Z',
      }),
      createHabit({
        name: '喝水',
        streakCurrent: 5,
        totalCompletions: 10,
        updatedAt: '2026-04-09T08:00:00.000Z',
      }),
      createHabit({
        name: '拉伸',
        streakCurrent: 5,
        totalCompletions: 12,
        updatedAt: '2026-04-09T07:00:00.000Z',
      }),
      createHabit({
        name: '冥想',
        streakCurrent: 5,
        totalCompletions: 12,
        updatedAt: '2026-04-09T10:00:00.000Z',
      }),
    ])

    const display = useHomeStarMapDisplay({
      aiInsight: computed(() => null),
      activeHabits,
    })

    expect(display.displayTopHabit.value).toBe('冥想')
  })
})
