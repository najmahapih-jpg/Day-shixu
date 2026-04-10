import { computed, ref, unref, type ComputedRef, type Ref } from 'vue'
import type { Habit } from '@/types'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

type TodayCheckInsLike = {
  keys: () => IterableIterator<string>
}

export interface UseTimelineLaneContainerOptions {
  todayHabits: MaybeRef<Habit[]>
  completedHabits: MaybeRef<Habit[]>
  todayCheckIns: MaybeRef<TodayCheckInsLike>
  dyingHabitIds: MaybeRef<string[]>
}

/**
 * Lane container aggregation state for the timeline page.
 *
 * Owns lightweight grouping and coda open/close state while leaving
 * initialization, business actions, and interaction orchestration in the page.
 */
export function useTimelineLaneContainer(options: UseTimelineLaneContainerOptions) {
  const codaOpen = ref(false)

  const floatingHabits = computed(() =>
    unref(options.todayHabits).filter((habit) => !habit.reminderTime),
  )

  const anchoredHabits = computed(() =>
    unref(options.todayHabits).filter((habit) => !!habit.reminderTime),
  )

  const codaHabits = computed(() => {
    const dyingHabitIds = unref(options.dyingHabitIds)
    return unref(options.completedHabits).filter(
      (habit) => !!habit.reminderTime && !dyingHabitIds.includes(habit._id!),
    )
  })

  const completedHabitIds = computed(() => Array.from(unref(options.todayCheckIns).keys()))

  function toggleCoda() {
    codaOpen.value = !codaOpen.value
  }

  return {
    codaOpen,
    floatingHabits,
    anchoredHabits,
    codaHabits,
    completedHabitIds,
    toggleCoda,
  }
}
