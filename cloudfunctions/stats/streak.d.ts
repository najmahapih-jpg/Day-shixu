type HabitDoc = {
  frequency?: string
  customDays?: number[]
}

export function isHabitActiveOnDate(
  habit: HabitDoc,
  dateStr: string,
): boolean

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
