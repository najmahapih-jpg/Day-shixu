import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { withDefaultPinia } from './pinia'
import { useHabitStore } from './habit'
import { useBoardStore } from './board'
import * as habitService from '@/services/habitService'
import type { BoardNote, CheckIn, Habit } from '@/types'
import { getToday } from '@/services/cloud'

export interface DailyArchive {
  id: string
  date: string
  notes: BoardNote[]
  checkIns: (CheckIn & { habit?: Habit })[]
  isMilestone: boolean
  milestoneHabits: Habit[]
}

export const useArchiveStore = withDefaultPinia(defineStore('archive', () => {
  const habitStore = useHabitStore()
  const boardStore = useBoardStore()

  const loading = ref(false)
  const archives = ref<DailyArchive[]>([])
  
  // Track how far back we have fetched
  const fetchedUntil = ref('')

  async function fetchArchive(days: number = 30) {
    if (loading.value) return
    loading.value = true
    try {
      // 1. Ensure board notes are loaded (they load all by default in this app)
      if (boardStore.notes.length === 0) {
        await boardStore.fetchNotes()
      }
      if (habitStore.habits.length === 0) {
        await habitStore.fetchHabits()
      }

      // 2. Fetch check-ins for the last N days (simulate cursor)
      const endDate = fetchedUntil.value ? fetchedUntil.value : getToday()
      // Calculate start date using UTC-safe arithmetic to avoid timezone off-by-one
      const [ey, em, ed] = endDate.split('-').map(Number)
      const startTs = Date.UTC(ey, em - 1, ed - days)
      const sd = new Date(startTs)
      const startDate = `${sd.getUTCFullYear()}-${String(sd.getUTCMonth() + 1).padStart(2, '0')}-${String(sd.getUTCDate()).padStart(2, '0')}`

      const checkIns = await habitService.getCheckInRange('', startDate, endDate)
      
      // Update fetchedUntil cursor
      fetchedUntil.value = startDate

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

        // Simple Milestone Logic: If this checkIn caused a streak of exactly 7, 21, 30, 100
        // (Assuming streakCurrent matches at the day. In a real app we might need historical streak values, but this is a simplified proxy)
        if (habit && [7, 21, 30, 100].includes(habit.streakCurrent) && getToday() === dateStr) {
          dailyMap.get(dateStr)!.isMilestone = true
          dailyMap.get(dateStr)!.milestoneHabits.push(habit)
        }
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
      
      // Append to list (handling duplicates if any)
      const existingIds = new Set(archives.value.map(a => a.id))
      const toAdd = newArchives.filter(a => !existingIds.has(a.id))
      archives.value = [...archives.value, ...toAdd].sort((a, b) => b.date.localeCompare(a.date))

    } catch (err) {
      uni.showToast({ title: '加载档案失败', icon: 'none' })
      if (process.env.NODE_ENV !== 'production') console.error(err)
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    archives.value = []
    loading.value = false
    fetchedUntil.value = ''
  }

  return {
    archives,
    loading,
    fetchArchive,
    $reset,
  }
}))
