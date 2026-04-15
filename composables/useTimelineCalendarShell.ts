import { computed, nextTick, ref, unref, type ComputedRef, type Ref } from 'vue'
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
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
]

const LUNAR_MONTH_NAMES = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']

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

  const calSelectedSubtitle = computed(() => {
    if (!calSelectedDate.value) return '选择日期'
    const day = calendarDays.value.find((item) => item.dateStr === calSelectedDate.value)
    const completed = day?.completed ?? 0
    const total = day?.total ?? 0
    const countText = total > 0 ? `${completed}/${total} 已完成` : '暂无安排'
    if (day?.holidayFull) return `${countText} · ${day.holidayFull}`
    if (day?.isWeekend) return `${countText} · 周末`
    return countText
  })

  const upcomingHolidays = computed(() =>
    getUpcoming(calYear.value, calMonth.value, unref(options.todayStr)),
  )

  function countdownLabel(daysUntil: number): string {
    if (daysUntil === 0) return '今天'
    if (daysUntil === 1) return '明天'
    if (daysUntil === 2) return '后天'
    if (daysUntil > 0) return `${daysUntil}天后`
    if (daysUntil === -1) return '昨天'
    return `${Math.abs(daysUntil)}天前`
  }

  function holidayIconClass(holiday: UpcomingHoliday): string {
    const iconMap: Record<string, string> = {
      '元旦': 'stamp-icon--firework',
      '劳动': 'stamp-icon--hammer',
      '国庆': 'stamp-icon--flag',
      '春节': 'stamp-icon--chunlian',
      '端午': 'stamp-icon--dragonboat',
      '中秋': 'stamp-icon--moon',
      '元宵': 'stamp-icon--lantern',
      '龙抬头': 'stamp-icon--dragon',
      '上巳': 'stamp-icon--ripple',
      '七夕': 'stamp-icon--magpie',
      '中元': 'stamp-icon--lotus',
      '重阳': 'stamp-icon--mountain',
      '腊八': 'stamp-icon--bowl',
      '小年': 'stamp-icon--broom',
      '除夕': 'stamp-icon--firecracker',
      '清明': 'stamp-icon--willow',
      '寒食': 'stamp-icon--ember',
      '情人': 'stamp-icon--heart',
      '妇女': 'stamp-icon--flower',
      '植树': 'stamp-icon--seedling',
      '青年': 'stamp-icon--flame',
      '儿童': 'stamp-icon--balloon',
      '七一': 'stamp-icon--badge',
      '八一': 'stamp-icon--shield',
      '教师': 'stamp-icon--book',
      '纪念': 'stamp-icon--monument',
      '双11': 'stamp-icon--bars',
      '平安': 'stamp-icon--bell',
      '圣诞': 'stamp-icon--tree',
      '跨年': 'stamp-icon--hourglass',
      '母亲': 'stamp-icon--carnation',
      '父亲': 'stamp-icon--crown',
      '感恩': 'stamp-icon--maple',
    }
    return iconMap[holiday.shortName] || 'stamp-icon--star'
  }

  return {
    calYear,
    calMonth,
    calSelectedDate,
    calHabitsExpanded,
    flipClass,
    calendarDays,
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
