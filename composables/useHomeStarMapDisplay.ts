import { computed, unref, type ComputedRef, type Ref } from 'vue'
import type { Habit, HabitInsight } from '@/types'

type MaybeRef<T> = Ref<T> | ComputedRef<T>
type StarMapHabitInput = Pick<Habit, 'name' | 'streakCurrent' | 'totalCompletions' | 'updatedAt'>

export interface UseHomeStarMapDisplayOptions {
  aiInsight: MaybeRef<HabitInsight | null>
  activeHabits: MaybeRef<StarMapHabitInput[]>
}

function compareHabitsForStarMap(left: StarMapHabitInput, right: StarMapHabitInput) {
  if ((right.streakCurrent || 0) !== (left.streakCurrent || 0)) {
    return (right.streakCurrent || 0) - (left.streakCurrent || 0)
  }

  if ((right.totalCompletions || 0) !== (left.totalCompletions || 0)) {
    return (right.totalCompletions || 0) - (left.totalCompletions || 0)
  }

  return (right.updatedAt || '').localeCompare(left.updatedAt || '')
}

/**
 * Read-only StarMap display derivations.
 *
 * Keeps score/highlight/top-habit mapping out of the page while leaving
 * StarMap interaction and easter-egg state in the page owner.
 */
export function useHomeStarMapDisplay(options: UseHomeStarMapDisplayOptions) {
  const aiInsightExists = computed(() => Boolean(unref(options.aiInsight)))

  const displayScore = computed(() => {
    const aiInsight = unref(options.aiInsight)
    if (!aiInsight?.trend) return '--'
    return aiInsight.trend.thisWeekRate ?? '--'
  })

  const displayHighlightCount = computed(() => {
    const aiInsight = unref(options.aiInsight)
    if (!aiInsight?.recommendations?.length) return '--'
    return aiInsight.recommendations.length
  })

  const displayTopHabit = computed(() => {
    const rankedHabit = [...unref(options.activeHabits)].sort(compareHabitsForStarMap)[0]
    return rankedHabit?.name || '--'
  })

  return {
    aiInsightExists,
    displayScore,
    displayHighlightCount,
    displayTopHabit,
  }
}
