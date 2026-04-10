import cloud = require('wx-server-sdk')
import type { CloudFailure, CloudResult, CloudSuccess } from '../_shared/cloud-types'
import { calcStreak, calcLongestStreak } from './streak'

type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'
type CheckInValue = boolean | number

type HabitDocument = {
  _id?: string
  _openid: string
  name?: string
  description?: string
  frequency?: HabitFrequency | string
  customDays?: number[]
  isArchived?: boolean
  streakCurrent?: number
  streakLongest?: number
  totalCompletions?: number
  order?: number
  createdAt?: unknown
  updatedAt?: unknown
} & Record<string, unknown>

type CheckInDocument = {
  _id?: string
  _openid: string
  habitId: string
  date: string
  month?: string
  type?: string
  value: CheckInValue
  createdAt?: unknown
  updatedAt?: unknown
} & Record<string, unknown>

type FreezeStatusResult = {
  usedThisMonth: number
  remaining: number
  todayFrozen: boolean
}

type CheckInActionResult = CheckInDocument & {
  streakCurrent: number
  streakLongest: number
}

type UncheckInResult = {
  _id: string
  streakCurrent: number
}

type HabitIdPayload = {
  id?: string
}

type HabitWritePayload = {
  name?: string
  description?: string
  frequency?: HabitFrequency | string
  customDays?: number[]
} & Record<string, unknown>

type HabitUpdatePayload = HabitIdPayload & HabitWritePayload

type ReorderPayload = {
  orderedIds?: string[]
}

type CheckInPayload = {
  habitId?: string
  date?: string
  value?: unknown
}

type UncheckInPayload = {
  habitId?: string
  date?: string
}

type GetCheckInsPayload = {
  habitId?: string
  date?: string
  startDate?: string
  endDate?: string
}

type FreezePayload = {
  date?: string
}

type HabitAction =
  | 'list'
  | 'get'
  | 'create'
  | 'update'
  | 'delete'
  | 'listArchived'
  | 'restore'
  | 'reorder'
  | 'checkIn'
  | 'uncheckIn'
  | 'getCheckIns'
  | 'freeze'
  | 'getFreezeStatus'

type HabitEvent = {
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

function ok<T>(data: T): CloudSuccess<T> {
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

function toIsoStr(d: Date | number | string = new Date()): string {
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  const hh = String(utc8.getUTCHours()).padStart(2, '0')
  const mm = String(utc8.getUTCMinutes()).padStart(2, '0')
  const ss = String(utc8.getUTCSeconds()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}+08:00`
}

const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/
function isValidDateStr(v: unknown): v is string {
  if (typeof v !== 'string' || !DATE_STR_RE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

const MAX_CHECKIN_RANGE_DAYS = 400

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
  const pageSize = 100
  for (let skip = 0; skip < maxRecords; skip += pageSize) {
    const res = await query.skip(skip).limit(pageSize).get()
    const data = ((res as { data?: T[] }).data || []) as T[]
    all.push(...data)
    if (data.length < pageSize) break
  }
  return all
}

const SYSTEM_FIELDS = [
  '_id',
  '_openid',
  'createdAt',
  'updatedAt',
  'streakCurrent',
  'streakLongest',
  'totalCompletions',
  'isArchived',
  'order',
  'id',
]

function sanitize<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {}
  Object.keys(obj).forEach((key) => {
    if (!SYSTEM_FIELDS.includes(key)) {
      cleaned[key as keyof T] = obj[key as keyof T]
    }
  })
  return cleaned
}

async function getList<T>(query: any): Promise<T[]> {
  const res = await query.get()
  return ((res as { data?: T[] }).data || []) as T[]
}

async function getDoc<T>(query: any): Promise<T> {
  const res = await query.get()
  return (res as { data: T }).data
}

async function getCount(query: any): Promise<number> {
  const res = await query.count()
  return Number((res as { total?: number }).total || 0)
}

async function addDoc<T>(collection: any, data: T): Promise<string> {
  const res = await collection.add({ data })
  return String((res as { _id: string })._id)
}

async function checkText(content: string | undefined, openid: string, scene: number): Promise<boolean> {
  if (!content || typeof content !== 'string' || !content.trim()) return true
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: content.trim().slice(0, 2500),
      version: 2,
      scene: scene || 2,
      openid,
    })
    return res.result.suggest !== 'risky'
  } catch (err) {
    console.error('[内容安全检查失败]', err)
    return true
  }
}

async function list(openid: string): Promise<CloudResult<HabitDocument[]>> {
  const data = await getList<HabitDocument>(
    habitsCol
      .where({ _openid: openid, isArchived: _.neq(true) })
      .orderBy('order', 'asc')
      .limit(100),
  )
  return ok(data)
}

async function get(openid: string, data?: HabitIdPayload): Promise<CloudResult<HabitDocument>> {
  if (!data || !data.id) return fail('缺少习惯 ID')
  let habit: HabitDocument
  try {
    habit = await getDoc<HabitDocument>(habitsCol.doc(data.id))
  } catch {
    return fail('习惯不存在')
  }
  if (habit._openid !== openid) return fail('无权访问')
  return ok(habit)
}

const MAX_HABITS_PER_USER = 200
const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

async function create(openid: string, data?: HabitWritePayload): Promise<CloudResult<HabitDocument>> {
  if (!data) return fail('缺少数据')
  if (!data.name || !data.name.trim()) return fail('习惯名称必填')

  if (data.name.length > MAX_NAME_LENGTH) {
    return fail(`习惯名称不能超过 ${MAX_NAME_LENGTH} 个字符`)
  }
  if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`习惯描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`)
  }

  if (data.name && !(await checkText(data.name, openid, 2))) {
    return fail('习惯名称包含违规内容，请修改后重试')
  }
  if (data.description && !(await checkText(data.description, openid, 2))) {
    return fail('习惯描述包含违规内容，请修改后重试')
  }

  const now = db.serverDate()
  const total = await getCount(
    habitsCol.where({ _openid: openid, isArchived: _.neq(true) }),
  )

  if (total >= MAX_HABITS_PER_USER) {
    return fail(`习惯数量已达上限（${MAX_HABITS_PER_USER}）`)
  }

  const record: HabitDocument = {
    ...sanitize(data),
    _openid: openid,
    createdAt: now,
    updatedAt: now,
    streakCurrent: 0,
    streakLongest: 0,
    totalCompletions: 0,
    isArchived: false,
    order: total,
  }
  const _id = await addDoc(habitsCol, record)
  return ok({ _id, ...record })
}

async function update(openid: string, data?: HabitUpdatePayload): Promise<CloudResult<{ _id: string } & Partial<HabitDocument>>> {
  if (!data || !data.id) return fail('缺少习惯 ID')

  if (data.name && data.name.length > MAX_NAME_LENGTH) {
    return fail(`习惯名称不能超过 ${MAX_NAME_LENGTH} 个字符`)
  }
  if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`习惯描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`)
  }

  if (data.name && !(await checkText(data.name, openid, 2))) {
    return fail('习惯名称包含违规内容，请修改后重试')
  }
  if (data.description && !(await checkText(data.description, openid, 2))) {
    return fail('习惯描述包含违规内容，请修改后重试')
  }

  const habit = await getDoc<HabitDocument>(habitsCol.doc(data.id))
  if (habit._openid !== openid) return fail('无权操作')

  const fields = sanitize(data)
  ;(fields as Partial<HabitDocument>).updatedAt = db.serverDate()

  await habitsCol.doc(data.id).update({ data: fields })
  return ok({ _id: data.id, ...fields })
}

async function remove(openid: string, data?: HabitIdPayload): Promise<CloudResult<{ _id: string }>> {
  if (!data || !data.id) return fail('缺少习惯 ID')
  const habit = await getDoc<HabitDocument>(habitsCol.doc(data.id))
  if (habit._openid !== openid) return fail('无权操作')

  await habitsCol.doc(data.id).update({
    data: { isArchived: true, updatedAt: db.serverDate() },
  })
  return ok({ _id: data.id })
}

async function listArchived(openid: string): Promise<CloudResult<HabitDocument[]>> {
  const data = await getList<HabitDocument>(
    habitsCol
      .where({ _openid: openid, isArchived: true })
      .orderBy('updatedAt', 'desc')
      .limit(100),
  )
  return ok(data)
}

async function restore(openid: string, data?: HabitIdPayload): Promise<CloudResult<{ _id: string }>> {
  if (!data || !data.id) return fail('缺少习惯 ID')
  const habit = await getDoc<HabitDocument>(habitsCol.doc(data.id))
  if (habit._openid !== openid) return fail('无权操作')
  if (!habit.isArchived) return fail('该习惯未归档')

  const total = await getCount(
    habitsCol.where({ _openid: openid, isArchived: _.neq(true) }),
  )

  await habitsCol.doc(data.id).update({
    data: {
      isArchived: false,
      order: total,
      streakCurrent: 0,
      updatedAt: db.serverDate(),
    },
  })
  return ok({ _id: data.id })
}

const FREEZE_HABIT_ID = '__freeze__'
const FREEZE_MONTHLY_LIMIT = 2
const STREAK_LOOKBACK = 365

async function freeze(openid: string, data?: FreezePayload): Promise<CloudResult<{ remaining: number }>> {
  if (!data || !data.date) return fail('缺少日期')
  if (!isValidDateStr(data.date)) return fail('日期格式不合法')
  const dateStr = toDateStr(data.date)

  const today = toDateStr(new Date())
  if (dateStr !== today) return fail('只能冻结当天')

  const existing = await getList<CheckInDocument>(
    checkInsCol.where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: dateStr }).limit(1),
  )
  if (existing.length > 0) return fail('今日已冻结')

  const month = dateStr.slice(0, 7)
  const usedThisMonth = await getCount(
    checkInsCol.where({ _openid: openid, habitId: FREEZE_HABIT_ID, month }),
  )
  if (usedThisMonth >= FREEZE_MONTHLY_LIMIT) return fail('本月冻结次数已用完')

  const _id = await addDoc(checkInsCol, {
    _openid: openid,
    habitId: FREEZE_HABIT_ID,
    date: dateStr,
    month,
    type: 'freeze',
    value: 1,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  })

  const duplicates = await getList<CheckInDocument>(
    checkInsCol
      .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: dateStr })
      .orderBy('createdAt', 'asc')
      .limit(5),
  )

  if (duplicates.length > 1 && _id !== duplicates[0]._id) {
    await checkInsCol.doc(_id).remove()
    return fail('今日已冻结')
  }

  const finalCount = await getCount(
    checkInsCol.where({ _openid: openid, habitId: FREEZE_HABIT_ID, month }),
  )

  if (finalCount > FREEZE_MONTHLY_LIMIT) {
    await checkInsCol.doc(_id).remove()
    return fail('本月冻结次数已用完')
  }

  return ok({ remaining: FREEZE_MONTHLY_LIMIT - finalCount })
}

async function getFreezeStatus(openid: string): Promise<CloudResult<FreezeStatusResult>> {
  const today = toDateStr(new Date())
  const month = today.slice(0, 7)

  const [countRes, todayRes] = await Promise.all([
    checkInsCol.where({ _openid: openid, habitId: FREEZE_HABIT_ID, month }).count(),
    checkInsCol.where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: today }).limit(1).get(),
  ])

  const usedThisMonth = Number((countRes as { total?: number }).total || 0)
  const todayFrozen = (((todayRes as { data?: CheckInDocument[] }).data) || []).length > 0

  return ok({
    usedThisMonth,
    remaining: Math.max(0, FREEZE_MONTHLY_LIMIT - usedThisMonth),
    todayFrozen,
  })
}

async function reorder(openid: string, data?: ReorderPayload): Promise<CloudResult<true>> {
  if (!data || !Array.isArray(data.orderedIds)) return fail('缺少 orderedIds')
  if (data.orderedIds.length > 200) return fail('排序数组过大')
  if (!data.orderedIds.every((id) => typeof id === 'string')) return fail('orderedIds 格式错误')

  const tasks = data.orderedIds.map((id, index) =>
    habitsCol
      .where({ _id: id, _openid: openid })
      .update({ data: { order: index, updatedAt: db.serverDate() } }),
  )
  await Promise.all(tasks)
  return ok(true)
}

function isValidCheckInValue(value: unknown): value is CheckInValue {
  if (value === undefined) return true
  if (typeof value === 'boolean') return true
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 && value <= 9999
  }
  return false
}

async function checkIn(openid: string, data?: CheckInPayload): Promise<CloudResult<CheckInActionResult>> {
  if (!data || !data.habitId || !data.date) {
    return fail('缺少 habitId 或 date')
  }
  const { habitId, date, value } = data

  if (!isValidDateStr(date)) return fail('日期格式不合法')
  if (!isValidCheckInValue(value)) {
    if (typeof value === 'number') {
      return fail('打卡值必须在 0-9999 之间')
    }
    return fail('打卡值类型不合法')
  }

  const dateStr = toDateStr(date)
  const habit = await getDoc<HabitDocument>(habitsCol.doc(habitId))
  if (habit._openid !== openid) return fail('无权操作')
  if (habit.isArchived) return fail('习惯已归档')

  const existing = await getList<CheckInDocument>(
    checkInsCol.where({ _openid: openid, habitId, date: dateStr }).limit(1),
  )

  const nextValue: CheckInValue = value !== undefined ? value : true
  let checkInRecord: CheckInDocument

  if (existing.length > 0) {
    await checkInsCol.doc(existing[0]._id).update({
      data: { value: nextValue, updatedAt: db.serverDate() },
    })
    checkInRecord = { ...existing[0], value: nextValue }
  } else {
    const newRecord: CheckInDocument = {
      _openid: openid,
      habitId,
      date: dateStr,
      value: nextValue,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }
    try {
      const _id = await addDoc(checkInsCol, newRecord)
      checkInRecord = { _id, ...newRecord }

      await habitsCol.doc(habitId).update({
        data: { totalCompletions: _.inc(1) },
      })
    } catch (dupErr) {
      const raceExisting = await getList<CheckInDocument>(
        checkInsCol.where({ _openid: openid, habitId, date: dateStr }).limit(1),
      )
      if (raceExisting.length > 0) {
        await checkInsCol.doc(raceExisting[0]._id).update({
          data: { value: nextValue, updatedAt: db.serverDate() },
        })
        checkInRecord = { ...raceExisting[0], value: nextValue }
      } else {
        throw dupErr
      }
    }
  }

  const recentDates = getRecentDates(dateStr, STREAK_LOOKBACK)
  const lookbackStart = recentDates[recentDates.length - 1]
  const [checkData, freezeData] = await Promise.all([
    paginatedGet<CheckInDocument>(
      checkInsCol
        .where({ _openid: openid, habitId, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
        .orderBy('date', 'desc'),
    ),
    paginatedGet<CheckInDocument>(
      checkInsCol
        .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
        .orderBy('date', 'desc'),
    ),
  ])

  const checkedSet = new Set(checkData.map((record) => record.date))
  const frozenSet = new Set(freezeData.map((record) => record.date))
  const today = toDateStr(new Date())
  const streakCurrent = calcStreak(
    recentDates,
    checkedSet,
    frozenSet,
    habit as Parameters<typeof calcStreak>[3],
    today,
  )

  const updateData: { streakCurrent: number; updatedAt: unknown; streakLongest?: number } = {
    streakCurrent,
    updatedAt: db.serverDate(),
  }
  if (streakCurrent > (habit.streakLongest || 0)) {
    updateData.streakLongest = streakCurrent
  }
  await habitsCol.doc(habitId).update({ data: updateData })

  return ok({
    ...checkInRecord,
    streakCurrent,
    streakLongest: updateData.streakLongest ?? (habit.streakLongest || 0),
  })
}

async function uncheckIn(openid: string, data?: UncheckInPayload): Promise<CloudResult<UncheckInResult>> {
  if (!data || !data.habitId || !data.date) {
    return fail('缺少 habitId 或 date')
  }
  const { habitId, date } = data
  if (!isValidDateStr(date)) return fail('日期格式不合法')
  const dateStr = toDateStr(date)

  const habit = await getDoc<HabitDocument>(habitsCol.doc(habitId))
  if (habit._openid !== openid) return fail('无权操作')
  if (habit.isArchived) return fail('习惯已归档')

  const existing = await getList<CheckInDocument>(
    checkInsCol.where({ _openid: openid, habitId, date: dateStr }).limit(1),
  )

  if (existing.length === 0) return fail('未找到打卡记录')

  await checkInsCol.doc(existing[0]._id).remove()

  if ((habit.totalCompletions || 0) > 0) {
    await habitsCol.doc(habitId).update({
      data: {
        totalCompletions: _.inc(-1),
        updatedAt: db.serverDate(),
      },
    })
  }

  const recentDates = getRecentDates(dateStr, STREAK_LOOKBACK)
  const lookbackStart = recentDates[recentDates.length - 1]
  const [uncheckData, freezeData] = await Promise.all([
    paginatedGet<CheckInDocument>(
      checkInsCol
        .where({ _openid: openid, habitId, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
        .orderBy('date', 'desc'),
    ),
    paginatedGet<CheckInDocument>(
      checkInsCol
        .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
        .orderBy('date', 'desc'),
    ),
  ])

  const checkedSet = new Set(uncheckData.map((record) => record.date))
  const frozenSet = new Set(freezeData.map((record) => record.date))
  const today = toDateStr(new Date())
  const streakCurrent = calcStreak(
    recentDates,
    checkedSet,
    frozenSet,
    habit as Parameters<typeof calcStreak>[3],
    today,
  )
  const streakLongest = calcLongestStreak(
    recentDates,
    checkedSet,
    frozenSet,
    habit as Parameters<typeof calcLongestStreak>[3],
  )
  await habitsCol.doc(habitId).update({
    data: { streakCurrent, streakLongest, updatedAt: db.serverDate() },
  })

  return ok({ _id: String(existing[0]._id), streakCurrent })
}

async function getCheckIns(openid: string, data?: GetCheckInsPayload): Promise<CloudResult<CheckInDocument[]>> {
  if (!data) return fail('缺少查询参数')
  const where: Record<string, unknown> = { _openid: openid }

  if (data.habitId) {
    where.habitId = data.habitId
  } else {
    where.habitId = _.neq(FREEZE_HABIT_ID)
  }

  if (data.date) {
    if (!isValidDateStr(data.date)) return fail('日期格式不合法')
    where.date = toDateStr(data.date)
  } else if (data.startDate && data.endDate) {
    if (!isValidDateStr(data.startDate) || !isValidDateStr(data.endDate)) {
      return fail('日期格式不合法')
    }
    const start = toDateStr(data.startDate)
    const end = toDateStr(data.endDate)
    if (start > end) return fail('startDate 不能晚于 endDate')
    const spanMs = parseDate(end).getTime() - parseDate(start).getTime()
    if (spanMs > MAX_CHECKIN_RANGE_DAYS * 24 * 3600 * 1000) {
      return fail('查询范围不能超过 ' + MAX_CHECKIN_RANGE_DAYS + ' 天')
    }
    where.date = _.gte(start).and(_.lte(end))
  } else {
    return fail('缺少 date 或 startDate+endDate')
  }

  const pageSize = 100
  let records: CheckInDocument[] = []
  let skip = 0
  while (true) {
    const page = await getList<CheckInDocument>(
      checkInsCol.where(where).orderBy('date', 'asc').skip(skip).limit(pageSize),
    )
    records = records.concat(page)
    if (page.length < pageSize) break
    skip += pageSize
    if (records.length >= 5000) break
  }
  return ok(records)
}

export async function main(event: HabitEvent = {}, _context?: unknown): Promise<CloudResult<unknown>> {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action, data } = event
  try {
    switch (action as HabitAction) {
      case 'list':
        return await list(OPENID)
      case 'get':
        return await get(OPENID, data as HabitIdPayload | undefined)
      case 'create':
        return await create(OPENID, data as HabitWritePayload | undefined)
      case 'update':
        return await update(OPENID, data as HabitUpdatePayload | undefined)
      case 'delete':
        return await remove(OPENID, data as HabitIdPayload | undefined)
      case 'listArchived':
        return await listArchived(OPENID)
      case 'restore':
        return await restore(OPENID, data as HabitIdPayload | undefined)
      case 'reorder':
        return await reorder(OPENID, data as ReorderPayload | undefined)
      case 'checkIn':
        return await checkIn(OPENID, data as CheckInPayload | undefined)
      case 'uncheckIn':
        return await uncheckIn(OPENID, data as UncheckInPayload | undefined)
      case 'getCheckIns':
        return await getCheckIns(OPENID, data as GetCheckInsPayload | undefined)
      case 'freeze':
        return await freeze(OPENID, data as FreezePayload | undefined)
      case 'getFreezeStatus':
        return await getFreezeStatus(OPENID)
      default:
        return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[' + action + ']', err)
    return fail('服务器错误，请稍后重试')
  }
}
