type HabitDoc = {
  frequency?: string
  customDays?: number[]
}

export function calcStreak(
  recentDates: string[],
  checkedDateSet: Set<string>,
  frozenDateSet: Set<string>,
  habit: HabitDoc,
  today?: string,
): number
