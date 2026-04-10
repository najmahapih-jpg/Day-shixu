import { getCurrentInstance, onUnmounted, ref, unref, type ComputedRef, type Ref } from 'vue'
import type { Habit } from '@/types'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

export interface UseTimelineLaneInteractionFlowOptions {
  todayHabits: MaybeRef<Habit[]>
  isChecking: MaybeRef<string | null>
  isHabitCompleted: (habit: Habit) => boolean
  handleCheck: (habitId: string, value: number) => Promise<boolean>
  startPianoPress: (habitId: string, duration?: number) => void
  startChecking: (habitId: string) => void
  finishChecking: (habitId?: string) => void
  flashJustCompleted: (habitId: string, duration?: number) => void
  clearLaneTicketTransition: (habitId: string) => void
  scheduleTicketFadeOut: (habitId: string) => void
  hapticLight: () => void
  hapticMedium: () => void
  hapticSuccess: () => void
  hapticCelebration: () => void
  interactionDelayMs?: number
  bravuraDelayMs?: number
}

const DEFAULT_INTERACTION_DELAY_MS = 600
const DEFAULT_BRAVURA_DELAY_MS = 2500

function resolveCheckValue(habit: Habit): number {
  return habit.type === 'boolean' ? 1 : Math.max(1, habit.targetValue || 1)
}

/**
 * Interaction orchestration for timeline lane / ticket entrypoints.
 *
 * This keeps the local lane interaction chain together without absorbing
 * page-level initialization, cross-store orchestration, or business data flow.
 */
export function useTimelineLaneInteractionFlow(options: UseTimelineLaneInteractionFlowOptions) {
  const showBravura = ref(false)
  const interactionDelayMs = options.interactionDelayMs ?? DEFAULT_INTERACTION_DELAY_MS
  const bravuraDelayMs = options.bravuraDelayMs ?? DEFAULT_BRAVURA_DELAY_MS

  const pendingTimers = new Set<ReturnType<typeof setTimeout>>()

  function schedule(fn: () => void, delay: number) {
    const timer = setTimeout(() => {
      pendingTimers.delete(timer)
      fn()
    }, delay)
    pendingTimers.add(timer)
    return timer
  }

  function clearPendingTimers() {
    pendingTimers.forEach((timer) => clearTimeout(timer))
    pendingTimers.clear()
  }

  function checkBravura() {
    const todayHabits = unref(options.todayHabits)
    if (!todayHabits.length) return

    const allDone = todayHabits.every((habit) => options.isHabitCompleted(habit))
    if (!allDone) return

    options.hapticCelebration()
    showBravura.value = false
    schedule(() => {
      showBravura.value = true
    }, bravuraDelayMs)
  }

  function onPianoKeyTap(habit: Habit) {
    if (!habit._id || unref(options.isChecking)) return

    options.hapticLight()
    options.startPianoPress(habit._id)

    if (options.isHabitCompleted(habit)) return

    const checkValue = resolveCheckValue(habit)
    options.startChecking(habit._id)

    schedule(async () => {
      options.finishChecking(habit._id)
      const habitId = habit._id!
      const success = await options.handleCheck(habitId, checkValue)
      if (!success) {
        options.clearLaneTicketTransition(habitId)
        return
      }

      options.flashJustCompleted(habitId)
      options.hapticSuccess()
      checkBravura()
    }, interactionDelayMs)
  }

  function onTicketTap(habit: Habit) {
    if (!habit._id || unref(options.isChecking)) return
    if (options.isHabitCompleted(habit)) return

    options.hapticMedium()

    const checkValue = resolveCheckValue(habit)
    options.startChecking(habit._id)

    schedule(async () => {
      options.finishChecking(habit._id)
      const habitId = habit._id!
      const success = await options.handleCheck(habitId, checkValue)
      if (!success) {
        options.clearLaneTicketTransition(habitId)
        return
      }

      options.hapticSuccess()
      options.scheduleTicketFadeOut(habitId)
      checkBravura()
    }, interactionDelayMs)
  }

  function resetLaneInteractionFlow() {
    clearPendingTimers()
    showBravura.value = false
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      resetLaneInteractionFlow()
    })
  }

  return {
    showBravura,
    onPianoKeyTap,
    onTicketTap,
    checkBravura,
    resetLaneInteractionFlow,
  }
}
