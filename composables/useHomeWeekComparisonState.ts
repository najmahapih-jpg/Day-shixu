import { ref } from 'vue'
import { getWeekdayFromDateStr } from '@/services/cloud'

type WeekRates = number[]
type ActiveHabitLike = { _id?: string }
type TodayCheckInsLike = { size: number }

function createEmptyWeekRates(): WeekRates {
  return Array.from({ length: 7 }, () => 0)
}

/**
 * State shell for the home-page week comparison lane.
 *
 * Owns the minimal mutable state around week comparison while keeping
 * network fetching and aggregation in the page-level main flow.
 */
export function useHomeWeekComparisonState() {
  const weekRates = ref<WeekRates>(createEmptyWeekRates())
  const weekDelta = ref(0)
  const weekCompareReady = ref(false)

  function beginWeekComparisonRefresh() {
    weekCompareReady.value = false
  }

  function setWeekComparisonResult(nextRates: WeekRates, nextDelta: number) {
    weekRates.value = [...nextRates]
    weekDelta.value = nextDelta
    weekCompareReady.value = true
  }

  function resetWeekComparison() {
    weekRates.value = createEmptyWeekRates()
    weekDelta.value = 0
    weekCompareReady.value = false
  }

  function syncWeekProgressForToday(options: {
    currentDate: string
    activeHabits: ActiveHabitLike[]
    todayCheckIns: TodayCheckInsLike
  }) {
    const totalActive = options.activeHabits.filter((habit) => Boolean(habit._id)).length
    if (totalActive === 0) return

    const nextRates = [...weekRates.value]
    nextRates[getWeekdayFromDateStr(options.currentDate)] = Math.round(
      (options.todayCheckIns.size / totalActive) * 100,
    )
    weekRates.value = nextRates
  }

  return {
    weekRates,
    weekDelta,
    weekCompareReady,
    beginWeekComparisonRefresh,
    setWeekComparisonResult,
    resetWeekComparison,
    syncWeekProgressForToday,
  }
}
