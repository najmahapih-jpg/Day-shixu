import { computed, getCurrentInstance, onUnmounted, ref, unref, type ComputedRef, type Ref } from 'vue'
import type { Habit } from '@/types'

type MaybeRef<T> = Ref<T> | ComputedRef<T>
type HabitTimerMap = Map<string, ReturnType<typeof setTimeout>>
type HabitCheckInLookup = {
  has: (habitId: string) => boolean
}

type UseHomeHabitUiStateOptions<THabit extends Pick<Habit, '_id'>> = {
  todayHabits: MaybeRef<THabit[]>
  todayCheckIns: MaybeRef<HabitCheckInLookup>
  reduceMotion: MaybeRef<boolean>
}

function pushUnique(list: Ref<string[]>, habitId: string) {
  if (!list.value.includes(habitId)) {
    list.value.push(habitId)
  }
}

function removeId(list: Ref<string[]>, habitId: string) {
  list.value = list.value.filter((id) => id !== habitId)
}

function clearTimer(timerMap: HabitTimerMap, habitId: string) {
  const timer = timerMap.get(habitId)
  if (!timer) return
  clearTimeout(timer)
  timerMap.delete(habitId)
}

function clearTimerGroup(timerMaps: HabitTimerMap[]) {
  timerMaps.forEach((timerMap) => {
    timerMap.forEach((timer) => clearTimeout(timer))
    timerMap.clear()
  })
}

/**
 * UI-only state for the home habits area.
 *
 * Keeps transition/warning pools and their timer lifecycle together
 * without moving business actions or store contracts out of the page.
 */
export function useHomeHabitUiState<THabit extends Pick<Habit, '_id'>>(options: UseHomeHabitUiStateOptions<THabit>) {
  const showCompleted = ref(false)
  const transitioningHabitIds = ref<string[]>([])
  const fadingHabitIds = ref<string[]>([])
  const warningHabitIds = ref<string[]>([])

  const habitFadeTimers: HabitTimerMap = new Map()
  const habitTransitionTimers: HabitTimerMap = new Map()
  const habitWarningTimers: HabitTimerMap = new Map()

  const displayPendingHabits = computed(() => {
    const todayHabits = unref(options.todayHabits)
    const todayCheckIns = unref(options.todayCheckIns)

    return todayHabits.filter((habit) => {
      if (!habit._id) return false
      return !todayCheckIns.has(habit._id) || transitioningHabitIds.value.includes(habit._id)
    })
  })

  const displayCompletedHabits = computed(() => {
    const todayHabits = unref(options.todayHabits)
    const todayCheckIns = unref(options.todayCheckIns)

    return todayHabits.filter((habit) => {
      if (!habit._id) return false
      return todayCheckIns.has(habit._id) && !transitioningHabitIds.value.includes(habit._id)
    })
  })

  function toggleCompleted() {
    showCompleted.value = !showCompleted.value
  }

  function clearHabitTransition(habitId: string) {
    clearTimer(habitFadeTimers, habitId)
    clearTimer(habitTransitionTimers, habitId)
    removeId(transitioningHabitIds, habitId)
    removeId(fadingHabitIds, habitId)
  }

  function clearHabitWarning(habitId: string) {
    clearTimer(habitWarningTimers, habitId)
    removeId(warningHabitIds, habitId)
  }

  function resetHabitUi(habitId: string) {
    clearHabitWarning(habitId)
    clearHabitTransition(habitId)
  }

  function startCheckTransition(habitId: string) {
    clearTimer(habitFadeTimers, habitId)
    pushUnique(transitioningHabitIds, habitId)

    const fadeDelay = unref(options.reduceMotion) ? 0 : 120
    const fadeTimer = setTimeout(() => {
      pushUnique(fadingHabitIds, habitId)
      habitFadeTimers.delete(habitId)
    }, fadeDelay)

    habitFadeTimers.set(habitId, fadeTimer)
  }

  function settleCheckTransition(habitId: string, onSettled?: () => void) {
    clearTimer(habitTransitionTimers, habitId)

    const settleDelay = unref(options.reduceMotion) ? 120 : 320
    const transitionTimer = setTimeout(() => {
      clearHabitTransition(habitId)
      onSettled?.()
    }, settleDelay)

    habitTransitionTimers.set(habitId, transitionTimer)
  }

  function markHabitWarning(habitId: string) {
    pushUnique(warningHabitIds, habitId)
    clearTimer(habitWarningTimers, habitId)

    const warningDelay = unref(options.reduceMotion) ? 180 : 320
    const warningTimer = setTimeout(() => {
      removeId(warningHabitIds, habitId)
      habitWarningTimers.delete(habitId)
    }, warningDelay)

    habitWarningTimers.set(habitId, warningTimer)
  }

  function resetAllHabitUi() {
    clearTimerGroup([habitFadeTimers, habitTransitionTimers, habitWarningTimers])
    transitioningHabitIds.value = []
    fadingHabitIds.value = []
    warningHabitIds.value = []
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      resetAllHabitUi()
    })
  }

  return {
    showCompleted,
    transitioningHabitIds,
    fadingHabitIds,
    warningHabitIds,
    displayPendingHabits,
    displayCompletedHabits,
    toggleCompleted,
    clearHabitTransition,
    clearHabitWarning,
    resetHabitUi,
    startCheckTransition,
    settleCheckTransition,
    markHabitWarning,
    resetAllHabitUi,
  }
}
