import { type ComputedRef, type Ref, unref } from 'vue'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

export interface UseTimelineDateInteractionFlowOptions {
  selectedDate: MaybeRef<string>
  todayStr: MaybeRef<string>
  isToday: MaybeRef<boolean>
  resetTransientHabitState: () => void
  resetLaneInteractionFlow: () => void
  beginDateFade: () => void
  finishDateFade: () => void
  triggerBlocksEntry: () => void
  setDateDirection: (direction: 'left' | 'right' | 'none') => void
  setSelectedDate: (date: string) => void
  loadDateData: () => Promise<unknown>
  hapticLight: () => void
}

/**
 * Timeline page-level date interaction orchestration.
 *
 * Owns date-strip interactions only: selecting a date, tapping a date,
 * and jumping back to today. Main data loading and page initialization
 * remain in the page owner.
 */
export function useTimelineDateInteractionFlow(options: UseTimelineDateInteractionFlowOptions) {
  function selectDate(date: string) {
    if (date === unref(options.selectedDate)) return

    options.resetTransientHabitState()
    options.resetLaneInteractionFlow()
    options.setDateDirection(date < unref(options.selectedDate) ? 'right' : 'left')
    options.beginDateFade()
    options.setSelectedDate(date)

    options.loadDateData().then(() => {
      options.finishDateFade()
      options.triggerBlocksEntry()
    })
  }

  function onDateTap(date: string) {
    options.hapticLight()
    selectDate(date)
  }

  function goToday() {
    if (unref(options.isToday)) return

    options.resetTransientHabitState()
    options.resetLaneInteractionFlow()
    options.setDateDirection(unref(options.todayStr) < unref(options.selectedDate) ? 'right' : 'left')
    options.setSelectedDate(unref(options.todayStr))
    void options.loadDateData()
  }

  return {
    selectDate,
    onDateTap,
    goToday,
  }
}
