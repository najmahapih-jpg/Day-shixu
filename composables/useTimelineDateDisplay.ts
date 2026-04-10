import { computed, unref, type ComputedRef, type Ref } from 'vue'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

export interface TimelineDateStripItem {
  date: string
  day: number
  weekday: string
  isToday: boolean
  checkInCount: number
  month: number
}

export interface UseTimelineDateDisplayOptions {
  selectedDate: MaybeRef<string>
  todayStr: MaybeRef<string>
  rangeCounts: MaybeRef<Map<string, number>>
  dateRange: number
  weekdayLabels: string[]
  reduceMotion: MaybeRef<boolean>
  offsetDate: (dateStr: string, days: number) => string
  getWeekdayFromDateStr: (dateStr: string) => number
}

/**
 * Read-only timeline date presentation derivations.
 *
 * Owns date-state flags, date strip items, selected-date labels, and
 * date-strip arc styling while keeping page-level orchestration elsewhere.
 */
export function useTimelineDateDisplay(options: UseTimelineDateDisplayOptions) {
  const isToday = computed(() => unref(options.selectedDate) === unref(options.todayStr))
  const isFuture = computed(() => unref(options.selectedDate) > unref(options.todayStr))
  const isPastDay = computed(() => unref(options.selectedDate) < unref(options.todayStr))

  const formattedSelectedDate = computed(() => {
    const [, month, day] = unref(options.selectedDate).split('-').map(Number)
    return `${month}月${day}日`
  })

  const monthDisplay = computed(() => {
    const month = Number(unref(options.selectedDate).split('-')[1])
    return `${month}月`
  })

  const selectedDateAnchor = computed(() => `d-${unref(options.selectedDate)}`)

  const dateList = computed<TimelineDateStripItem[]>(() => {
    const today = unref(options.todayStr)
    const counts = unref(options.rangeCounts)
    const items: TimelineDateStripItem[] = []

    for (let index = -options.dateRange; index <= options.dateRange; index += 1) {
      const dateStr = options.offsetDate(today, index)
      const [, month, day] = dateStr.split('-').map(Number)
      items.push({
        date: dateStr,
        day,
        weekday: options.weekdayLabels[options.getWeekdayFromDateStr(dateStr)],
        isToday: dateStr === today,
        checkInCount: counts.get(dateStr) ?? 0,
        month,
      })
    }

    return items
  })

  function getDateArcStyle(dayIdx: number): Record<string, string> {
    if (unref(options.reduceMotion)) return {}

    const selectedIdx = dateList.value.findIndex((day) => day.date === unref(options.selectedDate))
    if (selectedIdx < 0) return {}

    const dist = dayIdx - selectedIdx
    const absDist = Math.abs(dist)
    const scale = Math.max(0.82, 1 - absDist * 0.06)
    const translateY = absDist * absDist * 2
    const opacity = Math.max(0.5, 1 - absDist * 0.12)
    const rotateZ = dist * -1.5

    return {
      transform: `scale(${scale.toFixed(2)}) translateY(${translateY}rpx) rotate(${rotateZ.toFixed(1)}deg)`,
      opacity: opacity.toFixed(2),
      transition: 'transform 350ms cubic-bezier(0.34, 1.3, 0.64, 1), opacity 250ms ease',
    }
  }

  return {
    isToday,
    isFuture,
    isPastDay,
    formattedSelectedDate,
    monthDisplay,
    selectedDateAnchor,
    dateList,
  getDateArcStyle,
  }
}
