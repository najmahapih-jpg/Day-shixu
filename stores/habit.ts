import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as habitService from '@/services/habitService'
import { getToday, getWeekday1to7FromDateStr, getBeijingIsoNow } from '@/services/cloud'
import { getCache, setCache } from '@/utils/cache'
import { withRetry } from '@/utils/retry'
import { safeHabits, safeCheckIns } from '@/utils/safeData'
import type { Habit, CheckIn, FreezeStatus } from '@/types'

// --- Frequency filter helper ---

function getWeekday1to7(dateStr: string): number {
  return getWeekday1to7FromDateStr(dateStr)
}

function shouldShowToday(habit: Habit): boolean {
  // Keep frequency semantics consistent with create/timeline pages:
  // Monday=1 ... Sunday=7.
  const today = getToday()
  if (habit.startDate && today < habit.startDate) return false
  if (habit.endDate && today > habit.endDate) return false

  const weekday = getWeekday1to7(today)
  switch (habit.frequency) {
    case 'daily':
      return true
    case 'weekdays':
      return weekday >= 1 && weekday <= 5
    case 'weekends':
      return weekday === 6 || weekday === 7
    case 'custom':
      return Array.isArray(habit.customDays) && habit.customDays.includes(weekday)
    default:
      return true
  }
}

export const useHabitStore = defineStore('habit', () => {
  // --- State ---

  const habits = ref<Habit[]>([])
  const archivedHabits = ref<Habit[]>([])
  const todayCheckIns = ref<Map<string, CheckIn>>(new Map())
  const currentDate = ref(getToday())
  const loading = ref(false)
  const freezeStatus = ref<FreezeStatus>({
    usedThisMonth: 0,
    remaining: 2,
    todayFrozen: false,
  })
  let creatingPromise: Promise<Habit> | null = null
  const checkInLocks = new Map<string, boolean>()
  let fetchVersion = 0

  // --- Computed ---

  const activeHabits = computed(() =>
    habits.value.filter((h) => !h.isArchived),
  )

  // Today's scheduled habits (correct denominator for stats)
  const todayHabits = computed(() =>
    activeHabits.value.filter((h) => shouldShowToday(h)),
  )

  const pendingHabits = computed(() =>
    todayHabits.value.filter(
      (h) => h._id && !todayCheckIns.value.has(h._id),
    ),
  )

  const completedHabits = computed(() =>
    todayHabits.value.filter(
      (h) => h._id && todayCheckIns.value.has(h._id),
    ),
  )

  const completionRate = computed(() => {
    const total = todayHabits.value.length
    if (total === 0) return 0
    return Math.round((completedHabits.value.length / total) * 100)
  })

  // --- Actions ---

  async function fetchHabits() {
    const version = ++fetchVersion

    // Stale-while-revalidate: show cached data instantly if store is empty
    if (habits.value.length === 0) {
      const cached = getCache<Habit[]>('habits')
      if (cached) habits.value = safeHabits(cached)
    }

    loading.value = true
    try {
      const [habitList, checkInList] = await Promise.all([
        withRetry(() => habitService.getHabits()),
        withRetry(() => habitService.getCheckIns('', currentDate.value)),
      ])

      // Discard stale results
      if (version !== fetchVersion) return

      habits.value = safeHabits(habitList)
      setCache('habits', habits.value)

      const map = new Map<string, CheckIn>()
      for (const ci of safeCheckIns(checkInList)) {
        map.set(ci.habitId, ci)
      }
      todayCheckIns.value = map
    } catch (err) {
      if (version !== fetchVersion) return
      uni.showToast({ title: '加载习惯失败', icon: 'none' })
      throw err
    } finally {
      if (version === fetchVersion) {
        loading.value = false
      }
    }
  }

  async function checkIn(habitId: string, value: number = 1) {
    if (checkInLocks.get(habitId)) return
    checkInLocks.set(habitId, true)

    const now = getBeijingIsoNow()
    const optimistic: CheckIn = {
      habitId,
      date: currentDate.value,
      completed: true,
      value,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    }

    const prevMap = new Map(todayCheckIns.value)
    const prevHabits = [...habits.value]

    todayCheckIns.value = new Map(prevMap).set(habitId, optimistic)
    habits.value = habits.value.map((h) =>
      h._id === habitId
        ? {
          ...h,
          streakCurrent: h.streakCurrent + 1,
          totalCompletions: h.totalCompletions + 1,
        }
        : h,
    )

    try {
      const real = await habitService.doCheckIn(
        habitId,
        value,
        currentDate.value,
      )
      todayCheckIns.value = new Map(todayCheckIns.value).set(habitId, real)

      // Sync streak stats from server response
      const habit = habits.value.find((h) => h._id === habitId)
      if (habit && real.streakCurrent !== undefined) {
        habit.streakCurrent = real.streakCurrent
        habit.streakLongest = Math.max(habit.streakLongest, real.streakCurrent)
      }
    } catch (err) {
      todayCheckIns.value = prevMap
      habits.value = prevHabits
      uni.showToast({ title: '打卡失败，请重试', icon: 'none' })
      throw err
    } finally {
      checkInLocks.delete(habitId)
    }
  }

  async function uncheckIn(habitId: string) {
    if (checkInLocks.get(habitId)) return
    checkInLocks.set(habitId, true)

    const prevMap = new Map(todayCheckIns.value)
    const prevHabits = [...habits.value]

    todayCheckIns.value = new Map(
      [...todayCheckIns.value].filter(([key]) => key !== habitId),
    )

    habits.value = habits.value.map((h) =>
      h._id === habitId
        ? {
          ...h,
          streakCurrent: Math.max(0, h.streakCurrent - 1),
          totalCompletions: Math.max(0, h.totalCompletions - 1),
        }
        : h,
    )

    try {
      await habitService.undoCheckIn(habitId, currentDate.value)
    } catch (err) {
      todayCheckIns.value = prevMap
      habits.value = prevHabits
      uni.showToast({ title: '取消打卡失败，请重试', icon: 'none' })
      throw err
    } finally {
      checkInLocks.delete(habitId)
    }
  }

  function validateHabit(data: Partial<Habit>): string | null {
    if (!data.name || data.name.trim().length === 0) return '习惯名称不能为空'
    if (data.name.length > 20) return '习惯名称最多20个字符'
    if (data.type && !['boolean', 'counter', 'timer'].includes(data.type)) {
      return '无效的习惯类型'
    }
    if (data.type === 'counter' && (!data.targetValue || data.targetValue <= 0)) {
      return '计数目标必须大于0'
    }
    return null
  }

  async function createHabit(
    data: Omit<
      Habit,
      | '_id'
      | '_openid'
      | 'createdAt'
      | 'updatedAt'
      | 'streakCurrent'
      | 'streakLongest'
      | 'totalCompletions'
    >,
  ) {
    if (creatingPromise) {
      return creatingPromise
    }

    const error = validateHabit(data)
    if (error) {
      uni.showToast({ title: error, icon: 'none' })
      throw new Error(error)
    }

    creatingPromise = (async () => {
      try {
        const created = await habitService.createHabit(data)
        habits.value = [...habits.value, created]
        return created
      } catch (err) {
        uni.showToast({ title: '创建习惯失败', icon: 'none' })
        throw err
      }
    })()

    try {
      return await creatingPromise
    } finally {
      creatingPromise = null
    }
  }

  async function updateHabit(
    id: string,
    data: Partial<Omit<Habit, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
  ) {
    const prevHabits = [...habits.value]

    habits.value = habits.value.map((h) =>
      h._id === id ? { ...h, ...data } : h,
    )

    try {
      const updated = await habitService.updateHabit(id, data)
      habits.value = habits.value.map((h) =>
        h._id === id ? updated : h,
      )
      return updated
    } catch (err) {
      habits.value = prevHabits
      uni.showToast({ title: '更新习惯失败', icon: 'none' })
      throw err
    }
  }

  async function deleteHabit(id: string) {
    const prevHabits = [...habits.value]

    habits.value = habits.value.filter((h) => h._id !== id)

    try {
      await habitService.deleteHabit(id)

      // Clean up related ritual associations
      try {
        const { useRitualStore } = await import('@/stores/ritual')
        const ritualStore = useRitualStore()
        for (const ritual of ritualStore.rituals) {
          if (ritual._id && ritual.habitIds.includes(id)) {
            const updatedIds = ritual.habitIds.filter((hid) => hid !== id)
            await ritualStore.updateRitual(ritual._id, { habitIds: updatedIds })
          }
        }
      } catch {
        // Non-critical: ritual cleanup is best-effort
      }

      // Unlink related board notes
      try {
        const { useBoardStore } = await import('@/stores/board')
        const boardStore = useBoardStore()
        for (const note of boardStore.notes) {
          if (note._id && note.linkedHabitId === id) {
            await boardStore.updateNote(note._id, { linkedHabitId: '' })
          }
        }
      } catch {
        // Non-critical: board cleanup is best-effort
      }
    } catch (err) {
      habits.value = prevHabits
      uni.showToast({ title: '删除习惯失败', icon: 'none' })
      throw err
    }
  }

  async function fetchArchivedHabits() {
    try {
      archivedHabits.value = await habitService.getArchivedHabits()
    } catch (err) {
      uni.showToast({ title: '加载归档习惯失败', icon: 'none' })
      throw err
    }
  }

  async function restoreHabit(id: string) {
    const prevArchived = [...archivedHabits.value]
    const target = archivedHabits.value.find((h) => h._id === id)

    archivedHabits.value = archivedHabits.value.filter((h) => h._id !== id)

    try {
      await habitService.restoreHabit(id)
      if (target) {
        habits.value = [...habits.value, { ...target, isArchived: false }]
      }
    } catch (err) {
      archivedHabits.value = prevArchived
      uni.showToast({ title: '恢复习惯失败', icon: 'none' })
      throw err
    }
  }

  async function fetchFreezeStatus() {
    try {
      freezeStatus.value = await habitService.getFreezeStatus()
    } catch {
      // silent — keep default
    }
  }

  async function useFreeze() {
    // Guard: if user already has check-ins today, freezing is unnecessary
    if (todayCheckIns.value.size > 0) {
      uni.showToast({ title: '今天已有打卡记录，无需冻结', icon: 'none' })
      return false
    }

    try {
      const { remaining } = await habitService.freezeToday()
      freezeStatus.value = {
        usedThisMonth: freezeStatus.value.usedThisMonth + 1,
        remaining,
        todayFrozen: true,
      }
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : '冻结失败'
      uni.showToast({ title: msg, icon: 'none' })
      return false
    }
  }

  function $reset() {
    habits.value = []
    archivedHabits.value = []
    todayCheckIns.value = new Map()
    currentDate.value = getToday()
    loading.value = false
    freezeStatus.value = { usedThisMonth: 0, remaining: 2, todayFrozen: false }
    creatingPromise = null
    checkInLocks.clear()
    fetchVersion = 0
  }

  /**
   * Refresh currentDate if the app stayed open past midnight.
   * Call this in every page's onShow to avoid stale-day data.
   */
  async function refreshDateIfNeeded() {
    const today = getToday()
    if (currentDate.value !== today) {
      currentDate.value = today
      await fetchHabits()
    }
  }

  return {
    habits,
    archivedHabits,
    todayCheckIns,
    currentDate,
    loading,
    freezeStatus,
    activeHabits,
    todayHabits,
    pendingHabits,
    completedHabits,
    completionRate,
    fetchHabits,
    checkIn,
    uncheckIn,
    validateHabit,
    createHabit,
    updateHabit,
    deleteHabit,
    fetchArchivedHabits,
    restoreHabit,
    fetchFreezeStatus,
    useFreeze,
    refreshDateIfNeeded,
    $reset,
  }
})
