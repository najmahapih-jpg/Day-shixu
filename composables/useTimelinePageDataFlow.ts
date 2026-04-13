import { type ComputedRef, type Ref, unref } from 'vue'
import * as habitService from '@/services/habitService'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

interface TimelineCheckInLike {
  habitId?: string
  date?: string
}

export interface UseTimelinePageDataFlowOptions {
  ensureLoggedIn?: () => Promise<boolean>
  selectedDate: MaybeRef<string>
  todayStr: MaybeRef<string>
  dateRange: number
  setLoading: (value: boolean) => void
  setRangeCounts: (counts: Map<string, number>) => void
  triggerBlocksEntry: () => void
  setCurrentDate: (date: string) => void
  fetchHabits: () => Promise<unknown>
  offsetDate: (dateStr: string, days: number) => string
  onAuthFailure?: () => void
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

  async function ensureSession(notify = false) {
    const ready = options.ensureLoggedIn ? await options.ensureLoggedIn() : true
    if (!ready && notify) {
      options.onAuthFailure?.()
    }
    return ready
  }

  async function loadDateData(isInitial = false, _forceRefreshHabits = false, sessionReady?: boolean) {
    if (isInitial) options.setLoading(true)

    try {
      const ready = sessionReady ?? (options.ensureLoggedIn ? await ensureSession(true) : true)
      if (!ready) return

      options.setCurrentDate(unref(options.selectedDate))
      await options.fetchHabits()
    } catch {
      // error toasts handled in store
    } finally {
      options.setLoading(false)
    }
  }

  async function loadRangeCounts(sessionReady?: boolean) {
    try {
      const ready = sessionReady ?? (options.ensureLoggedIn ? await ensureSession(false) : true)
      if (!ready) {
        options.setRangeCounts(new Map())
        return
      }

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
    if (!options.ensureLoggedIn) {
      void loadDateData(true, true, true).then(() => {
        options.triggerBlocksEntry()
      })
      void loadRangeCounts(true)
      return
    }

    void (async () => {
      const ready = await ensureSession(true)
      if (!ready) {
        options.setLoading(false)
        options.setRangeCounts(new Map())
        return
      }

      void loadDateData(true, true, true).then(() => {
        options.triggerBlocksEntry()
      })
      void loadRangeCounts(true)
    })()
  }

  async function refreshPageData() {
    if (!options.ensureLoggedIn) {
      await Promise.all([loadDateData(false, true, true), loadRangeCounts(true)])
      return
    }

    const ready = await ensureSession(true)
    if (!ready) {
      options.setLoading(false)
      options.setRangeCounts(new Map())
      return
    }

    await Promise.all([loadDateData(false, true, true), loadRangeCounts(true)])
  }

  return {
    loadDateData,
    loadRangeCounts,
    loadPageEntryData,
    refreshPageData,
  }
}
