import { computed, getCurrentInstance, onUnmounted, ref, unref, type ComputedRef, type Ref } from 'vue'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

type ScrollRevealLike = {
  reset: () => void
  reveal: (index: number) => void
}

export interface UseTimelineModeUiShellOptions {
  dateDirection: MaybeRef<'left' | 'right' | 'none'>
  hours: MaybeRef<number[]>
  getHabitsForHour: (hour: number) => unknown[]
  ticketReveal: ScrollRevealLike
  entryStartDelayMs?: number
  groupRevealDelayMs?: number
  itemRevealDelayMs?: number
}

const DEFAULT_ENTRY_START_DELAY_MS = 80
const DEFAULT_GROUP_REVEAL_DELAY_MS = 120
const DEFAULT_ITEM_REVEAL_DELAY_MS = 60

/**
 * Timeline-mode local UI shell for date/lane visual transitions.
 *
 * Owns non-business presentation state such as date fading, slide class,
 * block entry timing, and the reveal timer lifecycle.
 */
export function useTimelineModeUiShell(options: UseTimelineModeUiShellOptions) {
  const blocksEntered = ref(false)
  const dateFading = ref(false)

  const pendingTimers = new Set<ReturnType<typeof setTimeout>>()

  const dateSlideClass = computed(() => {
    const direction = unref(options.dateDirection)
    if (direction === 'left') return 'tl-slide-left'
    if (direction === 'right') return 'tl-slide-right'
    return ''
  })

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

  function triggerBlocksEntry() {
    clearPendingTimers()
    blocksEntered.value = false
    options.ticketReveal.reset()

    schedule(() => {
      blocksEntered.value = true
      const visibleHours = unref(options.hours).filter((hour) => options.getHabitsForHour(hour).length > 0)

      visibleHours.forEach((hour, groupIdx) => {
        const habits = options.getHabitsForHour(hour)
        habits.forEach((_habit, habitIdx) => {
          schedule(() => {
            options.ticketReveal.reveal(hour * 10 + habitIdx)
          }, groupIdx * (options.groupRevealDelayMs ?? DEFAULT_GROUP_REVEAL_DELAY_MS) + habitIdx * (options.itemRevealDelayMs ?? DEFAULT_ITEM_REVEAL_DELAY_MS))
        })
      })
    }, options.entryStartDelayMs ?? DEFAULT_ENTRY_START_DELAY_MS)
  }

  function beginDateFade() {
    blocksEntered.value = false
    dateFading.value = true
  }

  function finishDateFade() {
    dateFading.value = false
  }

  function resetTimelineModeUiShell() {
    clearPendingTimers()
    blocksEntered.value = false
    dateFading.value = false
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      resetTimelineModeUiShell()
    })
  }

  return {
    blocksEntered,
    dateFading,
    dateSlideClass,
    triggerBlocksEntry,
    beginDateFade,
    finishDateFade,
    resetTimelineModeUiShell,
  }
}
