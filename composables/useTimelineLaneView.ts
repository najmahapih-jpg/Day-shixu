import { computed, unref, type ComputedRef, type Ref } from 'vue'
import type { Habit } from '@/types'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

type HabitLookup = {
  has: (habitId: string) => boolean
}

export interface UseTimelineLaneViewOptions {
  isToday: MaybeRef<boolean>
  nowMinuteOfDay: MaybeRef<number>
  anchoredHabits: MaybeRef<Habit[]>
  todayCheckIns: MaybeRef<HabitLookup>
  dyingHabitIds: MaybeRef<string[]>
}

/**
 * Read-only lane / ticket view helpers for timeline mode.
 *
 * Keeps hour grouping, completion/missed state, upcoming hint resolution,
 * and ticket label formatting out of the page owner while leaving
 * interaction and business actions in the page.
 */
export function useTimelineLaneView(options: UseTimelineLaneViewOptions) {
  const isHabitCompleted = (habit: Habit): boolean => {
    return !!habit._id && unref(options.todayCheckIns).has(habit._id)
  }

  const isHabitMissed = (habit: Habit): boolean => {
    if (!unref(options.isToday) || !habit.reminderTime) return false
    if (isHabitCompleted(habit)) return false

    const [hour, minute] = habit.reminderTime.split(':').map(Number)
    const reminderMinute = (hour || 0) * 60 + (minute || 0)
    return unref(options.nowMinuteOfDay) > reminderMinute + 30
  }

  const getHabitsForHour = (hour: number): Habit[] => {
    const dyingHabitIds = unref(options.dyingHabitIds)
    return unref(options.anchoredHabits).filter((habit) => {
      if (!habit.reminderTime) return false
      const reminderHour = parseInt(habit.reminderTime.split(':')[0], 10) || 0
      return reminderHour === hour && (!isHabitCompleted(habit) || dyingHabitIds.includes(habit._id!))
    })
  }

  const nextUpcomingHabit = computed(() => {
    if (!unref(options.isToday)) return null

    const now = unref(options.nowMinuteOfDay)
    let closest: Habit | null = null
    let closestTime = Infinity

    for (const habit of unref(options.anchoredHabits)) {
      if (isHabitCompleted(habit) || !habit.reminderTime) continue
      const [hour, minute] = habit.reminderTime.split(':').map(Number)
      const habitMinute = (hour || 0) * 60 + (minute || 0)
      if (habitMinute > now && habitMinute < closestTime) {
        closest = habit
        closestTime = habitMinute
      }
    }

    return closest
  })

  const getHabitTypeLabel = (habit: Habit): string => {
    if (habit.type === 'boolean') return '单次打卡'
    if (habit.type === 'counter') return `${habit.targetValue}${habit.unit || '次'}`
    const minutes = Math.max(1, Math.round((habit.targetValue || 60) / 60))
    return `${minutes} 分钟`
  }

  return {
    isHabitCompleted,
    isHabitMissed,
    getHabitsForHour,
    nextUpcomingHabit,
    getHabitTypeLabel,
  }
}
