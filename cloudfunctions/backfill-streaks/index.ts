import cloud = require('wx-server-sdk')
import type { CloudResult } from '../_shared/cloud-types'
import { calcLongestStreak, calcStreak } from './streak'

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
  updatedAt?: unknown
} & Record<string, unknown>

type CheckInDocument = {
  _id?: string
  _openid: string
  habitId: string
  date: string
  value?: boolean | number
  createdAt?: unknown
  updatedAt?: unknown
} & Record<string, unknown>

type BackfillAction = 'run'

type BackfillPayload = {
  dryRun?: boolean
  batchSize?: number
  skip?: number
  habitId?: string
  openid?: string
}

type BackfillEvent = {
  action?: string
  data?: unknown
}

type BackfillResultItem = {
  habitId: string | undefined
  name: string | undefined
  frequency: string
  changed: boolean
  oldCurrent: number
  newCurrent: number
  oldLongest: number
  newLongest: number
}

type BackfillErrorItem = {
  habitId: string | undefined
  name: string | undefined
  error: string
}

type BackfillDetail = BackfillResultItem | BackfillErrorItem

type BackfillSummary = {
  dryRun: boolean
  today: string
  skip: number
  batchSize: number
  processed: number
  changed: number
  unchanged: number
  errors: number
  details: BackfillDetail[]
  nextSkip: number | null
}

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db: any = cloud.database()
const _: any = db.command
const habitsCol: any = db.collection('habits')
const checkInsCol: any = db.collection('check_ins')

const STREAK_LOOKBACK = 365
const FREEZE_HABIT_ID = '__freeze__'

function fail(message: string): Extract<CloudResult<never>, { code: -1 }> {
  return { code: -1, message }
}

function ok<T>(data: T): Extract<CloudResult<T>, { code: 0 }> {
  return { code: 0, data }
}

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

function getRecentDates(baseDate: string | Date | number, n: number): string[] {
  const dates: string[] = []
  const base = parseDate(toDateStr(baseDate))
  for (let i = 0; i < n; i++) {
    const current = new Date(base)
    current.setUTCDate(current.getUTCDate() - i)
    dates.push(toDateStr(current))
  }
  return dates
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

async function fetchHabits({
  skip = 0,
  batchSize = 50,
  habitId,
  openid,
}: Required<Pick<BackfillPayload, 'skip' | 'batchSize'>> & Pick<BackfillPayload, 'habitId' | 'openid'>): Promise<HabitDocument[]> {
  if (habitId) {
    try {
      const result = await habitsCol.doc(habitId).get()
      return [((result as { data: HabitDocument }).data)]
    } catch {
      return []
    }
  }

  const where: Record<string, unknown> = { isArchived: _.neq(true) }
  if (openid) where._openid = openid

  const all: HabitDocument[] = []
  const PAGE = 100
  let fetched = 0
  let dbSkip = skip

  while (fetched < batchSize) {
    const limit = Math.min(PAGE, batchSize - fetched)
    const result = await habitsCol.where(where).skip(dbSkip).limit(limit).get()
    const data = ((result as { data?: HabitDocument[] }).data || []) as HabitDocument[]
    all.push(...data)
    fetched += data.length
    dbSkip += data.length
    if (data.length < limit) break
  }
  return all
}

async function processHabit(
  habit: HabitDocument,
  today: string,
  dryRun: boolean,
): Promise<BackfillResultItem> {
  const recentDates = getRecentDates(today, STREAK_LOOKBACK)
  const lookbackStart = recentDates[recentDates.length - 1]

  const [checkData, freezeData] = await Promise.all([
    paginatedGet<CheckInDocument>(
      checkInsCol
        .where({
          _openid: habit._openid,
          habitId: habit._id,
          date: _.gte(lookbackStart).and(_.lte(today)),
        })
        .orderBy('date', 'desc'),
    ),
    paginatedGet<CheckInDocument>(
      checkInsCol
        .where({
          _openid: habit._openid,
          habitId: FREEZE_HABIT_ID,
          date: _.gte(lookbackStart).and(_.lte(today)),
        })
        .orderBy('date', 'desc'),
    ),
  ])

  const checkedSet = new Set(checkData.map((record) => record.date))
  const frozenSet = new Set(freezeData.map((record) => record.date))

  const newCurrent = calcStreak(recentDates, checkedSet, frozenSet, habit, today) as number
  const newLongest = calcLongestStreak(recentDates, checkedSet, frozenSet, habit) as number

  const oldCurrent = habit.streakCurrent || 0
  const oldLongest = habit.streakLongest || 0
  const changed = newCurrent !== oldCurrent || newLongest !== oldLongest

  if (changed && !dryRun && habit._id) {
    await habitsCol.doc(habit._id).update({
      data: {
        streakCurrent: newCurrent,
        streakLongest: newLongest,
        updatedAt: db.serverDate(),
      },
    })
  }

  return {
    habitId: habit._id,
    name: typeof habit.name === 'string' ? habit.name : undefined,
    frequency: typeof habit.frequency === 'string' ? habit.frequency : 'daily',
    changed,
    oldCurrent,
    newCurrent,
    oldLongest,
    newLongest,
  }
}

export async function main(event: BackfillEvent = {}): Promise<CloudResult<BackfillSummary>> {
  const { action, data = {} } = event || {}
  if (action !== 'run') {
    return fail('未知操作: ' + action)
  }

  const payload = data as BackfillPayload
  const {
    dryRun = true,
    batchSize: rawBatchSize = 50,
    skip = 0,
    habitId,
    openid,
  } = payload

  const batchSize = Math.min(Math.max(1, rawBatchSize), 200)
  const today = toDateStr(new Date())

  console.log(
    `[backfill-streaks] start: dryRun=${dryRun}, batchSize=${batchSize}, skip=${skip}, habitId=${habitId || '-'}, openid=${openid || '-'}, today=${today}`,
  )

  const habits = await fetchHabits({ skip, batchSize, habitId, openid })
  console.log(`[backfill-streaks] fetched ${habits.length} habits`)

  let processed = 0
  let changed = 0
  let errors = 0
  const details: BackfillDetail[] = []

  for (const habit of habits) {
    try {
      const result = await processHabit(habit, today, dryRun)
      processed++
      if (result.changed) {
        changed++
        details.push(result)
        console.log(
          `[backfill-streaks] ${dryRun ? 'WOULD UPDATE' : 'UPDATED'}: ${habit._id} (${habit.name}) current: ${result.oldCurrent}→${result.newCurrent}, longest: ${result.oldLongest}→${result.newLongest}`,
        )
      }
    } catch (err) {
      errors++
      const error = err instanceof Error ? err.message : 'unknown'
      console.error(`[backfill-streaks] ERROR processing ${habit._id}:`, error)
      details.push({
        habitId: habit._id,
        name: typeof habit.name === 'string' ? habit.name : undefined,
        error,
      })
    }
  }

  const summary: BackfillSummary = {
    dryRun,
    today,
    skip,
    batchSize,
    processed,
    changed,
    unchanged: processed - changed,
    errors,
    details,
    nextSkip: habits.length === batchSize ? skip + batchSize : null,
  }

  console.log(
    `[backfill-streaks] done: processed=${processed}, changed=${changed}, errors=${errors}, nextSkip=${summary.nextSkip}`,
  )
  return ok(summary)
}
