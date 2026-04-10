type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'

type HabitDoc = {
  frequency?: HabitFrequency | string
  customDays?: number[]
}

export function calcStreak(
  recentDates: string[],
  checkedDateSet: Set<string>,
  frozenDateSet: Set<string>,
  habit: HabitDoc,
  today?: string,
): number

export function calcLongestStreak(
  recentDates: string[],
  checkedDateSet: Set<string>,
  frozenDateSet: Set<string>,
  habit: HabitDoc,
): number
