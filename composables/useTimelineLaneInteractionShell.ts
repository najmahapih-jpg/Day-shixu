import { getCurrentInstance, onUnmounted, ref } from 'vue'

type TicketTimerMap = Map<string, ReturnType<typeof setTimeout>[]>

function pushUnique(list: { value: string[] }, habitId: string) {
  if (!list.value.includes(habitId)) {
    list.value.push(habitId)
  }
}

function removeId(list: { value: string[] }, habitId: string) {
  list.value = list.value.filter((id) => id !== habitId)
}

/**
 * Local interaction shell for timeline lane / ticket UI.
 *
 * Owns short-lived press/loading/completion/fade state and their timers,
 * while keeping business actions in the timeline page owner.
 */
export function useTimelineLaneInteractionShell() {
  const pressingKeyId = ref<string | null>(null)
  const isChecking = ref<string | null>(null)
  const justCompletedId = ref<string | null>(null)
  const dyingHabitIds = ref<string[]>([])
  const fadingHabitIds = ref<string[]>([])

  const ticketTimers: TicketTimerMap = new Map()
  let pressingKeyTimer: ReturnType<typeof setTimeout> | null = null
  let justCompletedTimer: ReturnType<typeof setTimeout> | null = null

  function clearPressingKeyTimer() {
    if (!pressingKeyTimer) return
    clearTimeout(pressingKeyTimer)
    pressingKeyTimer = null
  }

  function clearJustCompletedTimer() {
    if (!justCompletedTimer) return
    clearTimeout(justCompletedTimer)
    justCompletedTimer = null
  }

  function clearTicketTimers(habitId?: string) {
    if (habitId) {
      const timers = ticketTimers.get(habitId) || []
      timers.forEach((timer) => clearTimeout(timer))
      ticketTimers.delete(habitId)
      return
    }

    ticketTimers.forEach((timers) => timers.forEach((timer) => clearTimeout(timer)))
    ticketTimers.clear()
  }

  function startPianoPress(habitId: string, duration = 300) {
    clearPressingKeyTimer()
    pressingKeyId.value = habitId
    pressingKeyTimer = setTimeout(() => {
      if (pressingKeyId.value === habitId) {
        pressingKeyId.value = null
      }
      pressingKeyTimer = null
    }, duration)
  }

  function startChecking(habitId: string) {
    isChecking.value = habitId
  }

  function finishChecking(habitId?: string) {
    if (!habitId || isChecking.value === habitId) {
      isChecking.value = null
    }
  }

  function flashJustCompleted(habitId: string, duration = 800) {
    clearJustCompletedTimer()
    justCompletedId.value = habitId
    justCompletedTimer = setTimeout(() => {
      if (justCompletedId.value === habitId) {
        justCompletedId.value = null
      }
      justCompletedTimer = null
    }, duration)
  }

  function clearTransientHabitState(habitId: string) {
    removeId(dyingHabitIds, habitId)
    removeId(fadingHabitIds, habitId)
    if (justCompletedId.value === habitId) {
      clearJustCompletedTimer()
      justCompletedId.value = null
    }
  }

  function clearLaneTicketTransition(habitId: string) {
    clearTicketTimers(habitId)
    clearTransientHabitState(habitId)
  }

  function resetTransientHabitState() {
    clearTicketTimers()
    clearJustCompletedTimer()
    dyingHabitIds.value = []
    fadingHabitIds.value = []
    justCompletedId.value = null
    isChecking.value = null
  }

  function scheduleTicketFadeOut(habitId: string) {
    clearTicketTimers(habitId)
    flashJustCompleted(habitId, 800)
    pushUnique(dyingHabitIds, habitId)

    const timers: ReturnType<typeof setTimeout>[] = []

    timers.push(setTimeout(() => {
      pushUnique(fadingHabitIds, habitId)
    }, 2000))

    timers.push(setTimeout(() => {
      clearLaneTicketTransition(habitId)
    }, 2500))

    ticketTimers.set(habitId, timers)
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      clearPressingKeyTimer()
      resetTransientHabitState()
    })
  }

  return {
    pressingKeyId,
    isChecking,
    justCompletedId,
    dyingHabitIds,
    fadingHabitIds,
    startPianoPress,
    startChecking,
    finishChecking,
    flashJustCompleted,
    clearTicketTimers,
    clearTransientHabitState,
    clearLaneTicketTransition,
    resetTransientHabitState,
    scheduleTicketFadeOut,
  }
}
