import { computed, unref, type ComputedRef, type Ref } from 'vue'
import { getBeijingDateParts, getToday, getWeekdayFromDateStr } from '@/services/cloud'
import { getMondayDate, offsetDateStr } from '@/utils/homeWeekComparison'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

type DateParts = ReturnType<typeof getBeijingDateParts>
type DisplayDateParts = Pick<DateParts, 'weekday'>

export interface HomeWeekCard {
  date: string
  weekday: string
  day: number
  rate: number
  level: 'none' | 'light' | 'mid' | 'strong'
  isToday: boolean
  illustration: string
}

export interface UseHomeWeekComparisonDisplayOptions {
  weekRates: MaybeRef<number[]>
  weekDelta: MaybeRef<number>
  weekCompareReady: MaybeRef<boolean>
  getTodayDate?: () => string
  getDateParts?: () => DisplayDateParts
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const ILLUSTRATION_NAMES = [
  'home-week-mon',
  'home-week-tue',
  'home-week-wed',
  'home-week-thu',
  'home-week-fri',
  'home-week-sat',
  'home-week-sun',
] as const

function resolveCardLevel(rate: number): HomeWeekCard['level'] {
  if (rate >= 80) return 'strong'
  if (rate >= 45) return 'mid'
  if (rate > 0) return 'light'
  return 'none'
}

/**
 * Read-only week comparison / week showcase display mapping.
 *
 * Keeps card construction, today-index mapping, and compare copy
 * separate from the request pipeline and state shell.
 */
export function useHomeWeekComparisonDisplay(options: UseHomeWeekComparisonDisplayOptions) {
  const getTodayDate = options.getTodayDate || getToday
  const getDateParts = options.getDateParts || getBeijingDateParts

  function getBaseTodayIndex() {
    const day = getDateParts().weekday
    return day === 0 ? 6 : day - 1
  }

  const weekCardData = computed<HomeWeekCard[]>(() => {
    const monday = getMondayDate(getTodayDate())
    const todayDate = getTodayDate()
    const weekRates = unref(options.weekRates)

    return Array.from({ length: 7 }, (_, index) => {
      const date = offsetDateStr(monday, index)
      const weekdayIdx = getWeekdayFromDateStr(date)
      const rawRate = weekRates[weekdayIdx] || 0
      const rate = Math.max(0, Math.min(rawRate, 100))
      const day = Number(date.split('-')[2]) || 0

      return {
        date,
        weekday: WEEKDAY_LABELS[index],
        day,
        rate,
        level: resolveCardLevel(rate),
        isToday: date === todayDate,
        illustration: ILLUSTRATION_NAMES[index],
      }
    })
  })

  const weekCompareText = computed(() => {
    if (!unref(options.weekCompareReady)) return '本周趋势'

    const weekDelta = unref(options.weekDelta)
    if (weekDelta > 0) return `本周较上周 +${weekDelta}%`
    if (weekDelta < 0) return `本周较上周 ${weekDelta}%`
    return '本周较上周持平'
  })

  return {
    getBaseTodayIndex,
    weekCardData,
    weekCompareText,
  }
}
