import { type ComputedRef, type Ref, unref } from 'vue'
import * as habitService from '@/services/habitService'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

interface TimelineCheckInLike {
  habitId?: string
  date?: string
}

export interface UseTimelinePageDataFlowOptions {
  selectedDate: MaybeRef<string>
  todayStr: MaybeRef<string>
  dateRange: number
  setLoading: (value: boolean) => void
  setRangeCounts: (counts: Map<string, number>) => void
  triggerBlocksEntry: () => void
  setCurrentDate: (date: string) => void
  fetchHabits: () => Promise<unknown>
  offsetDate: (dateStr: string, days: number) => string
  getCheckInRange?: (
    habitId: string,
    startDate: string,
    endDate: string,
  ) => Promise<TimelineCheckInLike[]>
}

function countUniqueHabitsByDate(checkIns: TimelineCheckInLike[]) {
  const counts = new Map<string, Set<string>>()

  for (const checkIn of checkIns) {
    if (!checkIn.habitId || !checkIn.date) continue
    const set = counts.get(checkIn.date) || new Set<string>()
    set.add(checkIn.habitId)
    counts.set(checkIn.date, set)
  }

  const result = new Map<string, number>()
  for (const [date, set] of counts) {
    result.set(date, set.size)
  }

  return result
}

/**
 * Timeline page request orchestration for selected-date data and visible-range counts.
 *
 * This module owns only the request flow and result-to-page-state wiring.
 * Timeline/calendar shells, interaction flows, and stable business boundaries
 * remain on the page owner.
 */
export function useTimelinePageDataFlow(options: UseTimelinePageDataFlowOptions) {
  const getCheckInRange = options.getCheckInRange || habitService.getCheckInRange

  async function loadDateData(isInitial = false, _forceRefreshHabits = false) {
    if (isInitial) options.setLoading(true)

    try {
      options.setCurrentDate(unref(options.selectedDate))
      await options.fetchHabits()
    } catch {
      // error toasts handled in store
    } finally {
      options.setLoading(false)
    }
  }

  async function loadRangeCounts() {
    try {
      const today = unref(options.todayStr)
      const startDate = options.offsetDate(today, -options.dateRange)
      const endDate = options.offsetDate(today, options.dateRange)
      const checkIns = await getCheckInRange('', startDate, endDate)
      options.setRangeCounts(countUniqueHabitsByDate(checkIns))
    } catch {
      options.setRangeCounts(new Map())
    }
  }

  function loadPageEntryData() {
    void loadDateData(true, true).then(() => {
      options.triggerBlocksEntry()
    })
    void loadRangeCounts()
  }

  async function refreshPageData() {
    await Promise.all([loadDateData(false, true), loadRangeCounts()])
  }

  return {
    loadDateData,
    loadRangeCounts,
    loadPageEntryData,
    refreshPageData,
  }
}
