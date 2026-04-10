import cloud = require('wx-server-sdk')
import type { CloudFailure, CloudResult } from '../_shared/cloud-types'
import { calcLongestStreak, calcStreak, isHabitActiveOnDate } from './streak'

type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'

type HabitDocument = {
  _id?: string
  _openid: string
  name?: string
  frequency?: HabitFrequency | string
  customDays?: number[]
  isArchived?: boolean
  streakCurrent?: number
  streakLongest?: number
  totalCompletions?: number
} & Record<string, unknown>

type CheckInDocument = {
  _id?: string
  _openid: string
  habitId: string
  date: string
  value?: boolean | number
  type?: string
  createdAt?: unknown
  updatedAt?: unknown
} & Record<string, unknown>

type HeatmapDay = {
  date: string
  count: number
  total: number
  rate: number
  frozen: boolean
}

type HeatmapResult = {
  days: HeatmapDay[]
  truncated: boolean
}

type HabitStreakView = {
  id: string | undefined
  name: string | undefined
  currentStreak: number
  longestStreak: number
}

type StreaksResult = {
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  habits: HabitStreakView[]
  truncated?: boolean
}

type WeeklyRatePoint = {
  day: string
  rate: number
}

type WeeklyComparisonResult = {
  thisWeek: WeeklyRatePoint[]
  lastWeek: WeeklyRatePoint[]
  improvement: number
  truncated: boolean
}

type BatchGetCheckInsResult = {
  records: CheckInDocument[]
  truncated: boolean
}

type GetHeatmapPayload = {
  startDate?: string
  endDate?: string
}

type StatsAction = 'getHeatmap' | 'getStreaks' | 'getWeeklyComparison'

type StatsEvent = {
  action?: string
  data?: unknown
}

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db: any = cloud.database()
const _: any = db.command
const habitsCol: any = db.collection('habits')
const checkInsCol: any = db.collection('check_ins')

function fail(message: string): CloudFailure {
  return { code: -1, message }
}

function ok<T>(data: T): Extract<CloudResult<T>, { code: 0 }> {
  return { code: 0, data }
}

const FREEZE_HABIT_ID = '__freeze__'
const MAX_DATE_RANGE_DAYS = 400
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateStr(d: string | Date | number): string {
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
  const dt = typeof d === 'number' ? new Date(d) : (typeof d === 'string' ? new Date(d) : d)
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function getWeekday(dateStr: string): number {
  return parseDate(dateStr).getUTCDay()
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const current = new Date(start)
  while (current <= end) {
    dates.push(toDateStr(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

function getTodayStr(): string {
  return toDateStr(new Date())
}

function getMonday(dateStr: string): string {
  const date = parseDate(dateStr)
  const weekday = date.getUTCDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  date.setUTCDate(date.getUTCDate() + diff)
  return toDateStr(date)
}

async function batchGetCheckIns(where: Record<string, unknown>, maxRecords = 50000): Promise<BatchGetCheckInsResult> {
  const MAX = 100
  let records: CheckInDocument[] = []
  let skip = 0
  let truncated = false
  while (true) {
    const result = await checkInsCol
      .where(where)
      .skip(skip)
      .limit(MAX)
      .get()
    const data = ((result as { data?: CheckInDocument[] }).data || []) as CheckInDocument[]
    records = records.concat(data)
    if (data.length < MAX) break
    if (records.length >= maxRecords) {
      truncated = true
      console.warn('[stats] batchGetCheckIns truncated at', maxRecords, 'records')
      break
    }
    skip += MAX
  }
  return { records, truncated }
}

async function paginatedGet<T>(query: any, maxRecords = 400): Promise<T[]> {
  const all: T[] = []
  const PAGE = 100
  for (let skip = 0; skip < maxRecords; skip += PAGE) {
    const result = await query.skip(skip).limit(PAGE).get()
    const data = ((result as { data?: T[] }).data || []) as T[]
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}

function getRecentDates(baseDate: string, n: number): string[] {
  const dates: string[] = []
  const base = parseDate(baseDate)
  for (let i = 0; i < n; i++) {
    const date = new Date(base)
    date.setUTCDate(date.getUTCDate() - i)
    dates.push(toDateStr(date))
  }
  return dates
}

function isValidDate(dateStr: string): boolean {
  const date = parseDate(toDateStr(dateStr))
  return !Number.isNaN(date.getTime())
}

async function getHeatmap(openid: string, data?: GetHeatmapPayload): Promise<CloudResult<HeatmapResult>> {
  if (!data || !data.startDate || !data.endDate) {
    return fail('缺少 startDate 或 endDate')
  }

  if (!isValidDate(data.startDate) || !isValidDate(data.endDate)) {
    return fail('日期格式不合法')
  }

  const startDate = toDateStr(data.startDate)
  const endDate = toDateStr(data.endDate)

  if (startDate > endDate) {
    return fail('startDate 不能晚于 endDate')
  }

  const rangeMs = parseDate(endDate).getTime() - parseDate(startDate).getTime()
  if (rangeMs > MAX_DATE_RANGE_DAYS * 24 * 3600 * 1000) {
    return fail('查询范围不能超过 400 天')
  }

  const habits = await paginatedGet<HabitDocument>(
    habitsCol.where({ _openid: openid, isArchived: _.neq(true) }),
  )

  const checkInsResult = await batchGetCheckIns({
    _openid: openid,
    habitId: _.neq(FREEZE_HABIT_ID),
    date: _.gte(startDate).and(_.lte(endDate)),
  })
  const checkIns = checkInsResult.records

  const freezeResult = await batchGetCheckIns({
    _openid: openid,
    habitId: FREEZE_HABIT_ID,
    date: _.gte(startDate).and(_.lte(endDate)),
  })
  const frozenDates = new Set(freezeResult.records.map((record) => record.date))
  const truncated = checkInsResult.truncated || freezeResult.truncated

  const uniquePerDay: Record<string, Set<string>> = {}
  checkIns.forEach((checkIn) => {
    if (!uniquePerDay[checkIn.date]) uniquePerDay[checkIn.date] = new Set<string>()
    uniquePerDay[checkIn.date].add(checkIn.habitId)
  })
  const checkInsByDate: Record<string, number> = {}
  Object.keys(uniquePerDay).forEach((date) => {
    checkInsByDate[date] = uniquePerDay[date].size
  })

  const allDates = getDateRange(startDate, endDate)
  const days: HeatmapDay[] = allDates.map((date) => {
    const count = checkInsByDate[date] || 0
    const total = habits.filter((habit) => isHabitActiveOnDate(habit, date)).length
    const rate = total > 0 ? Math.round((count / total) * 100) / 100 : 0
    const frozen = frozenDates.has(date)
    return { date, count, total, rate, frozen }
  })

  return ok({ days, truncated })
}

async function getStreaks(openid: string): Promise<CloudResult<StreaksResult>> {
  const today = getTodayStr()
  const LOOKBACK = 365
  const recentDates = getRecentDates(today, LOOKBACK)
  const lookbackDate = recentDates[recentDates.length - 1]

  const habits = await paginatedGet<HabitDocument>(
    habitsCol.where({ _openid: openid, isArchived: _.neq(true) }),
  )

  if (habits.length === 0) {
    return ok({
      currentStreak: 0,
      longestStreak: 0,
      totalCheckIns: 0,
      habits: [],
    })
  }

  const [allCheckInsResult, freezeResult] = await Promise.all([
    batchGetCheckIns({
      _openid: openid,
      habitId: _.neq(FREEZE_HABIT_ID),
      date: _.gte(lookbackDate).and(_.lte(today)),
    }),
    batchGetCheckIns({
      _openid: openid,
      habitId: FREEZE_HABIT_ID,
      date: _.gte(lookbackDate).and(_.lte(today)),
    }),
  ])

  const allCheckIns = allCheckInsResult.records
  const frozenSet = new Set(freezeResult.records.map((record) => record.date))
  const truncated = allCheckInsResult.truncated || freezeResult.truncated

  const checkInsByHabit: Record<string, Set<string>> = {}
  allCheckIns.forEach((checkIn) => {
    if (!checkInsByHabit[checkIn.habitId]) checkInsByHabit[checkIn.habitId] = new Set<string>()
    checkInsByHabit[checkIn.habitId].add(checkIn.date)
  })

  let globalCurrentStreak = 0
  let globalLongestStreak = 0
  const totalCheckIns = allCheckIns.length

  const habitStreaks: HabitStreakView[] = habits.map((habit) => {
    const checkedDates = checkInsByHabit[String(habit._id || '')] || new Set<string>()
    const currentStreak = calcStreak(recentDates, checkedDates, frozenSet, habit, today) as number
    const longestStreak = calcLongestStreak(recentDates, checkedDates, frozenSet, habit) as number

    if (currentStreak > globalCurrentStreak) globalCurrentStreak = currentStreak
    if (longestStreak > globalLongestStreak) globalLongestStreak = longestStreak

    return {
      id: typeof habit._id === 'string' ? habit._id : undefined,
      name: typeof habit.name === 'string' ? habit.name : undefined,
      currentStreak,
      longestStreak,
    }
  })

  return ok({
    currentStreak: globalCurrentStreak,
    longestStreak: globalLongestStreak,
    totalCheckIns,
    habits: habitStreaks,
    truncated,
  })
}

async function getWeeklyComparison(openid: string): Promise<CloudResult<WeeklyComparisonResult>> {
  const today = getTodayStr()
  const thisMonday = getMonday(today)
  const lastMonday = toDateStr(
    new Date(parseDate(thisMonday).getTime() - 7 * 24 * 3600 * 1000),
  )
  const elapsedDays = Math.round(
    (parseDate(today).getTime() - parseDate(thisMonday).getTime()) / (24 * 3600 * 1000),
  )
  const lastWeekEnd = toDateStr(
    new Date(parseDate(lastMonday).getTime() + elapsedDays * 24 * 3600 * 1000),
  )

  const habits = await paginatedGet<HabitDocument>(
    habitsCol.where({ _openid: openid, isArchived: _.neq(true) }),
  )

  const checkInsResult = await batchGetCheckIns({
    _openid: openid,
    habitId: _.neq(FREEZE_HABIT_ID),
    date: _.gte(lastMonday).and(_.lte(today)),
  })
  const checkIns = checkInsResult.records
  const truncated = checkInsResult.truncated

  const uniquePerDay: Record<string, Set<string>> = {}
  checkIns.forEach((checkIn) => {
    if (!uniquePerDay[checkIn.date]) uniquePerDay[checkIn.date] = new Set<string>()
    uniquePerDay[checkIn.date].add(checkIn.habitId)
  })
  const checkInsByDate: Record<string, number> = {}
  Object.keys(uniquePerDay).forEach((date) => {
    checkInsByDate[date] = uniquePerDay[date].size
  })

  function buildWeekData(mondayStr: string, endStr: string): WeeklyRatePoint[] {
    const dates = getDateRange(mondayStr, endStr)
    return dates.map((date, index) => {
      const count = checkInsByDate[date] || 0
      const total = habits.filter((habit) => isHabitActiveOnDate(habit, date)).length
      const rate = total > 0 ? Math.round((count / total) * 100) / 100 : 0
      return { day: DAY_LABELS[index], rate }
    })
  }

  const thisWeek = buildWeekData(thisMonday, today)
  const lastWeek = buildWeekData(lastMonday, lastWeekEnd)

  const avgThis = thisWeek.length > 0
    ? thisWeek.reduce((sum, day) => sum + day.rate, 0) / thisWeek.length
    : 0
  const avgLast = lastWeek.length > 0
    ? lastWeek.reduce((sum, day) => sum + day.rate, 0) / lastWeek.length
    : 0
  const improvement = Math.round((avgThis - avgLast) * 100) / 100

  return ok({ thisWeek, lastWeek, improvement, truncated })
}

export const _test = { batchGetCheckIns }

export async function main(event: StatsEvent = {}, _context?: unknown): Promise<CloudResult<unknown>> {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action, data } = event
  try {
    switch (action as StatsAction) {
      case 'getHeatmap':
        return await getHeatmap(OPENID, data as GetHeatmapPayload | undefined)
      case 'getStreaks':
        return await getStreaks(OPENID)
      case 'getWeeklyComparison':
        return await getWeeklyComparison(OPENID)
      default:
        return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[stats/' + action + ']', err)
    return fail('服务器错误，请稍后重试')
  }
}
