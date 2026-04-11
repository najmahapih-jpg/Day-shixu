import { computed, nextTick, ref, unref, watch, type ComputedRef, type Ref } from 'vue'
import { getBeijingDateParts, getWeekdayFromDateStr } from '@/services/cloud'
import {
  getHolidayInfo,
  getLunarDate,
  getSolarTerm,
  getUpcomingHolidays,
  type HolidayType,
  type UpcomingHoliday,
} from '@/utils/holiday'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

type DateParts = {
  year: number
  month: number
}

type HolidayInfoLike = {
  name?: string
  type?: HolidayType | ''
} | null | undefined

type LunarDateLike = {
  month: number
  day: number
} | null | undefined

type ScheduleNextTick = (callback: () => void) => void | Promise<void>
type SetTimeoutLike = (callback: () => void, delay: number) => unknown
type ClearTimeoutLike = (handle: unknown) => void

export interface TimelineCalendarDay {
  dateStr: string
  day: number
  isToday: boolean
  isCurrentMonth: boolean
  isWeekend: boolean
  holidayFull: string
  holidayType: HolidayType | ''
  lunarText: string
  solarTerm: string
  total: number
  completed: number
  rate: number
}

export interface UseTimelineCalendarShellOptions {
  todayStr: MaybeRef<string>
  rangeCounts: MaybeRef<Map<string, number>>
  totalActiveHabits: MaybeRef<number>
  weekdayLabels: string[]
  getInitialDateParts?: () => DateParts
  getWeekdayFromDateStr?: (dateStr: string) => number
  getHolidayInfo?: (dateStr: string) => HolidayInfoLike
  getLunarDate?: (dateStr: string) => LunarDateLike
  getSolarTerm?: (dateStr: string) => string
  getUpcomingHolidays?: (year: number, month: number, todayStr: string) => UpcomingHoliday[]
  scheduleNextTick?: ScheduleNextTick
  setTimeoutFn?: SetTimeoutLike
  clearTimeoutFn?: ClearTimeoutLike
  flipDurationMs?: number
}

const LUNAR_DAY_NAMES = [
  '', 'é’æ¿…ç«´', 'é’æ¿…ç°©', 'é’æ¿…ç¬', 'é’æ¿†æ´“', 'é’æ¿…ç°²', 'é’æ¿†åš', 'é’æ¿…ç«·', 'é’æ¿†å“', 'é’æ¿…ç¯€', 'é’æ¿†å´„',
  'é—ä½·ç«´', 'é—ä½·ç°©', 'é—ä½·ç¬', 'é—ä½¸æ´“', 'é—ä½·ç°²', 'é—ä½¸åš', 'é—ä½·ç«·', 'é—ä½¸å“', 'é—ä½·ç¯€', 'æµœå±½å´„',
  'å¯¤å¤¸ç«´', 'å¯¤å¤¸ç°©', 'å¯¤å¤¸ç¬', 'å¯¤åž®æ´“', 'å¯¤å¤¸ç°²', 'å¯¤åž®åš', 'å¯¤å¤¸ç«·', 'å¯¤åž®å“', 'å¯¤å¤¸ç¯€', 'æ¶“å¤Šå´„',
]

const LUNAR_MONTH_NAMES = ['', 'å§ï½†æ¹€', 'æµœå±¾æ¹€', 'æ¶“å¤‹æ¹€', 'é¥æ¶™æ¹€', 'æµœæ—€æ¹€', 'éî…Ÿæ¹€', 'æ¶“å†©æ¹€', 'éî‚£æ¹€', 'æ¶”æ¿‡æ¹€', 'é—ä½¹æ¹€', 'éî„æ¹€', 'é‘µå©ƒæ¹€']

/**
 * Timeline calendar-mode shell.
 *
 * Owns only calendar-local state, display derivations, and local interactions:
 * month paging, selected date, expandable detail state, and holiday display helpers.
 * Main page initialization, page data flow, and timeline-side stable boundaries
 * intentionally stay in the page owner.
 */
export function useTimelineCalendarShell(options: UseTimelineCalendarShellOptions) {
  const resolveInitialDateParts = options.getInitialDateParts || getBeijingDateParts
  const getWeekday = options.getWeekdayFromDateStr || getWeekdayFromDateStr
  const getHoliday = options.getHolidayInfo || getHolidayInfo
  const getLunar = options.getLunarDate || getLunarDate
  const getSolar = options.getSolarTerm || getSolarTerm
  const getUpcoming = options.getUpcomingHolidays || getUpcomingHolidays
  const scheduleNextTick = options.scheduleNextTick || ((callback) => { void nextTick(callback) })
  const setTimeoutFn = options.setTimeoutFn || ((callback, delay) => setTimeout(callback, delay))
  const clearTimeoutFn = options.clearTimeoutFn || ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>))
  const flipDurationMs = options.flipDurationMs ?? 300

  const initialDateParts = resolveInitialDateParts()
  const calYear = ref(initialDateParts.year)
  const calMonth = ref(initialDateParts.month)
  const calSelectedDate = ref('')
  const calHabitsExpanded = ref(true)
  const calDateCheckSet = ref<Set<string>>(new Set())
  const flipClass = ref('')

  let flipTimeout: unknown = null

  function toggleCalHabits() {
    calHabitsExpanded.value = !calHabitsExpanded.value
  }

  function triggerFlip(direction: 'left' | 'right') {
    if (flipTimeout !== null) clearTimeoutFn(flipTimeout)
    flipClass.value = ''
    scheduleNextTick(() => {
      flipClass.value = `flip-${direction}`
      flipTimeout = setTimeoutFn(() => {
        flipClass.value = ''
      }, flipDurationMs)
    })
  }

  function prevMonth() {
    triggerFlip('right')
    if (calMonth.value === 1) {
      calMonth.value = 12
      calYear.value--
    } else {
      calMonth.value--
    }
    calSelectedDate.value = ''
  }

  function nextMonth() {
    triggerFlip('left')
    if (calMonth.value === 12) {
      calMonth.value = 1
      calYear.value++
    } else {
      calMonth.value++
    }
    calSelectedDate.value = ''
  }

  function selectCalDate(dateStr: string) {
    const isToggleOff = calSelectedDate.value === dateStr
    calSelectedDate.value = isToggleOff ? '' : dateStr
    if (!isToggleOff) calHabitsExpanded.value = true
  }

  function getLunarText(dateStr: string): string {
    const lunar = getLunar(dateStr)
    if (!lunar) return ''
    if (lunar.day === 1) return LUNAR_MONTH_NAMES[lunar.month] || ''
    return LUNAR_DAY_NAMES[lunar.day] || ''
  }

  const calendarDays = computed<TimelineCalendarDay[]>(() => {
    const y = calYear.value
    const m = calMonth.value
    const today = unref(options.todayStr)

    const firstDay = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const daysInPrevMonth = new Date(Date.UTC(y, m - 1, 0)).getUTCDate()
    const totalActive = unref(options.totalActiveHabits)
    const visibleCounts = unref(options.rangeCounts)

    const days: TimelineCalendarDay[] = []

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const prevM = m === 1 ? 12 : m - 1
      const prevY = m === 1 ? y - 1 : y
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        dateStr,
        day: d,
        isToday: dateStr === today,
        isCurrentMonth: false,
        isWeekend: getWeekday(dateStr) === 0 || getWeekday(dateStr) === 6,
        holidayFull: '',
        holidayType: '',
        lunarText: getLunarText(dateStr),
        solarTerm: getSolar(dateStr) || '',
        total: 0,
        completed: 0,
        rate: 0,
      })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const holidayInfo = getHoliday(dateStr)
      const completed = visibleCounts.get(dateStr) ?? 0
      const rate = totalActive > 0 ? Math.min(completed / totalActive, 1) : 0
      days.push({
        dateStr,
        day: d,
        isToday: dateStr === today,
        isCurrentMonth: true,
        isWeekend: getWeekday(dateStr) === 0 || getWeekday(dateStr) === 6,
        holidayFull: holidayInfo?.name || '',
        holidayType: holidayInfo?.type || '',
        lunarText: getLunarText(dateStr),
        solarTerm: getSolar(dateStr) || '',
        total: totalActive,
        completed,
        rate,
      })
    }

    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const nextM = m === 12 ? 1 : m + 1
      const nextY = m === 12 ? y + 1 : y
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        dateStr,
        day: d,
        isToday: dateStr === today,
        isCurrentMonth: false,
        isWeekend: getWeekday(dateStr) === 0 || getWeekday(dateStr) === 6,
        holidayFull: '',
        holidayType: '',
        lunarText: getLunarText(dateStr),
        solarTerm: getSolar(dateStr) || '',
        total: 0,
        completed: 0,
        rate: 0,
      })
    }

    return days
  })

  const calDateDisplay = computed(() => {
    if (calSelectedDate.value) {
      const [, month, day] = calSelectedDate.value.split('-').map(Number)
      const weekday = options.weekdayLabels[getWeekday(calSelectedDate.value)]
      return `${month}æœˆ${day}æ—¥ Â· å‘¨${weekday}`
    }
    const midStr = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}-15`
    const solarTerm = getSolar(midStr)
    return solarTerm || `${calMonth.value}æœˆèŠ‚å¾‹`
  })

  const calSelectedSubtitle = computed(() => {
    if (!calSelectedDate.value) return '????'
    const day = calendarDays.value.find((item) => item.dateStr === calSelectedDate.value)
    const completed = day?.completed ?? 0
    const total = day?.total ?? 0
    const countText = total > 0 ? `${completed}/${total} ???` : '?????'
    if (day?.holidayFull) return `${countText} ? ${day.holidayFull}`
    if (day?.isWeekend) return `${countText} ? ??`
    return countText
  })

  const upcomingHolidays = computed(() =>
    getUpcoming(calYear.value, calMonth.value, unref(options.todayStr)),
  )

  function countdownLabel(daysUntil: number): string {
    if (daysUntil === 0) return '??'
    if (daysUntil === 1) return '??'
    if (daysUntil === 2) return '??'
    if (daysUntil > 0) return `${daysUntil}??`
    if (daysUntil === -1) return '??'
    return `${Math.abs(daysUntil)}??`
  }

  function holidayIconClass(holiday: UpcomingHoliday): string {
    const iconMap: Record<string, string> = {
      'éå†©æ£ª': 'stamp-icon--firework',
      'é”å†²å§©': 'stamp-icon--hammer',
      'é¥è—‰ç°¡': 'stamp-icon--flag',
      'é„ãƒ¨å¦­': 'stamp-icon--chunlian',
      'ç»”îˆšå´': 'stamp-icon--dragonboat',
      'æ¶“î… î': 'stamp-icon--moon',
      'éå†¨î†Œ': 'stamp-icon--lantern',
      '???': 'stamp-icon--dragon',
      'æ¶“å©‚çƒ¦': 'stamp-icon--ripple',
      'æ¶“å†¨î˜º': 'stamp-icon--magpie',
      'æ¶“î…žåŽ“': 'stamp-icon--lotus',
      'é–²å¶‰æ§¼': 'stamp-icon--mountain',
      'é‘µå©‚å“': 'stamp-icon--bowl',
      'çå¿“å‹¾': 'stamp-icon--broom',
      'é—„ã‚…î˜º': 'stamp-icon--firecracker',
      'å¨“å‘®æ§‘': 'stamp-icon--willow',
      'ç€µæŽ—î—¤': 'stamp-icon--ember',
      'éŽ¯å‘¬æ±‰': 'stamp-icon--heart',
      'æ¿¡å›§ã‚³': 'stamp-icon--flower',
      'å¦žå¶†çˆ²': 'stamp-icon--seedling',
      'é—ˆæŽ‘å‹¾': 'stamp-icon--flame',
      'éŽè·¨î¢': 'stamp-icon--balloon',
      'æ¶“å†§ç«´': 'stamp-icon--badge',
      'éî‚¡ç«´': 'stamp-icon--shield',
      'éæ¬ç¬€': 'stamp-icon--book',
      'ç»¾î„åº·': 'stamp-icon--monument',
      'é™?1': 'stamp-icon--bars',
      'éªžå†²ç•¨': 'stamp-icon--bell',
      'é¦ï½ˆç™': 'stamp-icon--tree',
      'ç’ºã„¥å‹¾': 'stamp-icon--hourglass',
      'å§£å¶„ç¿°': 'stamp-icon--carnation',
      'é–æœµç¿°': 'stamp-icon--crown',
      'éŽ°ç†¸ä»¼': 'stamp-icon--maple',
    }
    return iconMap[holiday.shortName] || 'stamp-icon--star'
  }

  watch(calSelectedDate, (date) => {
    if (!date) {
      calDateCheckSet.value = new Set()
      return
    }
    calDateCheckSet.value = new Set()
  })

  return {
    calYear,
    calMonth,
    calSelectedDate,
    calHabitsExpanded,
    flipClass,
    calendarDays,
    calDateDisplay,
    calSelectedSubtitle,
    upcomingHolidays,
    toggleCalHabits,
    prevMonth,
    nextMonth,
    selectCalDate,
    countdownLabel,
    holidayIconClass,
  }
}
