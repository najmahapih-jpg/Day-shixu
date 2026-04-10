import { ref } from 'vue'
import { defineStore } from 'pinia'
import { withDefaultPinia } from './pinia'
import { useHabitStore } from './habit'
import { useBoardStore } from './board'
import * as habitService from '@/services/habitService'
import type { BoardNote, CheckIn, Habit } from '@/types'
import { getToday } from '@/services/cloud'
// Canonical milestone computation (pure JS, unit-tested under jest).
// @ts-ignore — plain JS sibling module without explicit .d.ts
import archiveMilestonesModule from './archive.milestones.cjs'

const {
  computeHistoricalMilestones: computeHistoricalMilestonesJs,
  mergeArchiveBatch: mergeArchiveBatchJs,
} = archiveMilestonesModule as {
  computeHistoricalMilestones: (
    checkInsByHabit: Map<string, string[]>,
  ) => Map<string, Set<string>>
  mergeArchiveBatch: (
    existing: DailyArchive[],
    incoming: DailyArchive[],
  ) => DailyArchive[]
}

export interface DailyArchive {
  id: string
  date: string
  notes: BoardNote[]
  checkIns: (CheckIn & { habit?: Habit })[]
  isMilestone: boolean
  milestoneHabits: Habit[]
}

/**
 * Window caveat for historical milestone computation: we only see the
 * check-ins passed in, so a streak that started before the fetched
 * window is under-counted at its leading edge. Fetching older batches
 * upgrades earlier days to milestones on re-computation. This replaces
 * the previous (broken) behavior of flagging dates based on
 * `habit.streakCurrent` (the live streak value, unrelated to the
 * historical date being rendered).
 */
export const computeHistoricalMilestones = computeHistoricalMilestonesJs as (
  checkInsByHabit: Map<string, string[]>,
) => Map<string, Set<string>>

const mergeArchiveBatch = mergeArchiveBatchJs as (
  existing: DailyArchive[],
  incoming: DailyArchive[],
) => DailyArchive[]

export const useArchiveStore = withDefaultPinia(defineStore('archive', () => {
  const habitStore = useHabitStore()
  const boardStore = useBoardStore()

  const loading = ref(false)
  const archives = ref<DailyArchive[]>([])

  // Track how far back we have fetched
  const fetchedUntil = ref('')
  // In-flight guard independent of loading.value — prevents a second
  // fetch from starting even within the same synchronous tick, and makes
  // re-entrance safety explicit at the call site.
  let inFlight = false
  // Monotonically increasing fetch token. Every fetch captures its own
  // version at start; before writing state it checks the token still
  // matches. $reset() bumps the token, so any fetch started under an
  // older generation becomes a no-op when it resolves late.
  let fetchVersion = 0

  async function fetchArchive(days: number = 30) {
    if (inFlight || loading.value) return
    inFlight = true
    loading.value = true
    const version = ++fetchVersion
    // Snapshot cursor locally; only advance the ref AFTER the merge completes.
    const endDate = fetchedUntil.value ? fetchedUntil.value : getToday()
    const [ey, em, ed] = endDate.split('-').map(Number)
    const startTs = Date.UTC(ey, em - 1, ed - days)
    const sd = new Date(startTs)
    const startDate = `${sd.getUTCFullYear()}-${String(sd.getUTCMonth() + 1).padStart(2, '0')}-${String(sd.getUTCDate()).padStart(2, '0')}`

    try {
      // 1. Ensure board notes are loaded (they load all by default in this app)
      if (boardStore.notes.length === 0) {
        await boardStore.fetchNotes()
        if (version !== fetchVersion) return
      }
      if (habitStore.habits.length === 0) {
        await habitStore.fetchHabits()
        if (version !== fetchVersion) return
      }

      // 2. Fetch check-ins for the last N days (simulate cursor)
      const checkIns = await habitService.getCheckInRange('', startDate, endDate)
      // Bail out if a reset or newer fetch has invalidated us mid-flight.
      if (version !== fetchVersion) return

      // 3. Aggregate CheckIns and Notes by Date
      const dailyMap = new Map<string, DailyArchive>()

      // Group checkins (Attach habit metadata)
      checkIns.forEach(ci => {
        const dateStr = ci.date
        if (!dailyMap.has(dateStr)) {
          dailyMap.set(dateStr, { id: dateStr, date: dateStr, notes: [], checkIns: [], isMilestone: false, milestoneHabits: [] })
        }
        const habit = habitStore.habits.find(h => h._id === ci.habitId)
        dailyMap.get(dateStr)!.checkIns.push({ ...ci, habit })
      })

      // Group Notes
      boardStore.notes.forEach(note => {
        const dateStr = (note.createdAt || getToday()).split('T')[0]
        // Only include if it falls in our fetched range or if it was already grouped
        if (dateStr >= startDate && dateStr <= getToday()) {
          if (!dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, { id: dateStr, date: dateStr, notes: [], checkIns: [], isMilestone: false, milestoneHabits: [] })
          }
          dailyMap.get(dateStr)!.notes.push(note)
        }
      })

      // Convert to sorted array (Desc)
      const newArchives = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))

      // Append to list (handling duplicates if any).
      // Uses pure merge helper — unit-tested in archive.milestones.test.js.
      const merged = mergeArchiveBatch(archives.value, newArchives)

      // 4. Recompute historical milestones across ALL loaded archives
      // (previous batches + this batch). Milestones are a function of the
      // per-habit check-in sequence, so a newly loaded older batch can
      // legitimately upgrade an existing day to a milestone.
      const byHabit = new Map<string, string[]>()
      for (const day of merged) {
        for (const ci of day.checkIns) {
          if (!ci.habitId) continue
          const arr = byHabit.get(ci.habitId) ?? []
          arr.push(day.date)
          byHabit.set(ci.habitId, arr)
        }
      }
      const milestoneMap = computeHistoricalMilestones(byHabit)
      for (const day of merged) {
        const hits: Habit[] = []
        for (const ci of day.checkIns) {
          const dates = milestoneMap.get(ci.habitId)
          if (dates?.has(day.date) && ci.habit) hits.push(ci.habit)
        }
        day.isMilestone = hits.length > 0
        day.milestoneHabits = hits
      }

      archives.value = merged
      // Cursor only advances after the full batch has been merged.
      fetchedUntil.value = startDate
    } catch (err) {
      if (version !== fetchVersion) return
      uni.showToast({ title: '加载档案失败', icon: 'none' })
      if (process.env.NODE_ENV !== 'production') console.error(err)
    } finally {
      // Only clear flags if our generation is still current. A stale
      // fetch resolving late after $reset()/newer fetchArchive() must
      // not wipe the newer generation's loading/inFlight flags.
      if (version === fetchVersion) {
        loading.value = false
        inFlight = false
      }
    }
  }

  function $reset() {
    // Bump the fetch token first — any in-flight fetch will see its
    // captured version go stale and bail at the next await checkpoint
    // instead of writing post-reset state.
    fetchVersion++
    archives.value = []
    loading.value = false
    fetchedUntil.value = ''
    // Symmetric with loading.value — if a fetch was in flight when
    // caller navigates away and back, the subsequent fetchArchive()
    // must not be blocked by a stale in-flight flag.
    inFlight = false
  }

  return {
    archives,
    loading,
    fetchArchive,
    $reset,
  }
}))
