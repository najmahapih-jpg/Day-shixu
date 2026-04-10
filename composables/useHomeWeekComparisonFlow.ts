import { unref, type ComputedRef, type Ref } from 'vue'
import * as habitService from '@/services/habitService'
import { getToday, getWeekdayFromDateStr } from '@/services/cloud'
import {
  dailyUniqueCount,
  daysDiff,
  getMondayDate,
  offsetDateStr,
  type WeekComparisonCheckInLike,
} from '@/utils/homeWeekComparison'

type MaybeRef<T> = Ref<T> | ComputedRef<T>
type ActiveHabitLike = { _id?: string }

export interface UseHomeWeekComparisonFlowOptions {
  activeHabits: MaybeRef<ActiveHabitLike[]>
  currentDate: MaybeRef<string | null | undefined>
  beginWeekComparisonRefresh: () => void
  setWeekComparisonResult: (nextRates: number[], nextDelta: number) => void
  resetWeekComparison: () => void
  getCheckInRange?: (
    habitId: string,
    startDate: string,
    endDate: string,
  ) => Promise<WeekComparisonCheckInLike[]>
}

/**
 * Week comparison request orchestration for the home page.
 *
 * This module owns only the request flow and result-to-state-shell wiring.
 * Display derivations, pure math, and mutable state are intentionally kept
 * in their dedicated home week comparison modules.
 */
export function useHomeWeekComparisonFlow(options: UseHomeWeekComparisonFlowOptions) {
  const getCheckInRange = options.getCheckInRange || habitService.getCheckInRange

  async function loadWeekComparison() {
    options.beginWeekComparisonRefresh()

    const activeIds = unref(options.activeHabits)
      .map((habit) => habit._id)
      .filter((id): id is string => Boolean(id))

    const totalActive = activeIds.length
    if (totalActive === 0) {
      options.resetWeekComparison()
      return
    }

    try {
      const today = unref(options.currentDate) || getToday()
      const monday = getMondayDate(today)
      const daysElapsed = Math.max(1, Math.min(daysDiff(monday, today) + 1, 7))

      const thisStart = monday
      const thisEnd = offsetDateStr(monday, daysElapsed - 1)
      const lastStart = offsetDateStr(monday, -7)
      const lastEnd = offsetDateStr(lastStart, daysElapsed - 1)

      const [thisWeekRaw, lastWeekRaw] = await Promise.all([
        getCheckInRange('', thisStart, thisEnd),
        getCheckInRange('', lastStart, lastEnd),
      ])

      const thisWeek = thisWeekRaw.filter((checkIn) => activeIds.includes(checkIn.habitId))
      const lastWeek = lastWeekRaw.filter((checkIn) => activeIds.includes(checkIn.habitId))
      const thisDayCount = dailyUniqueCount(thisWeek)
      const lastDayCount = dailyUniqueCount(lastWeek)

      const nextRates = Array.from({ length: 7 }, () => 0)
      let thisSum = 0
      let lastSum = 0

      for (let index = 0; index < daysElapsed; index++) {
        const thisDate = offsetDateStr(monday, index)
        const lastDate = offsetDateStr(lastStart, index)
        const thisRate = Math.round(((thisDayCount.get(thisDate) || 0) / totalActive) * 100)
        const lastRate = Math.round(((lastDayCount.get(lastDate) || 0) / totalActive) * 100)

        nextRates[getWeekdayFromDateStr(thisDate)] = thisRate
        thisSum += thisRate
        lastSum += lastRate
      }

      options.setWeekComparisonResult(
        nextRates,
        Math.round(thisSum / daysElapsed - lastSum / daysElapsed),
      )
    } catch {
      options.resetWeekComparison()
    }
  }

  return {
    loadWeekComparison,
  }
}
