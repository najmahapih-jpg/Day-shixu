import cloud = require('wx-server-sdk')
import { calcStreak } from './streak'

type CloudSuccess<T> = {
  code: 0
  data: T
}

type CloudFailure<T = unknown> = {
  code: -1
  message: string
  data?: T
}

type CloudResponse<T, F = unknown> = CloudSuccess<T> | CloudFailure<F>

type OrderedRitualType = 'morning' | 'afternoon' | 'evening' | 'custom'

type RitualDocument = {
  _id?: string
  _openid: string
  name?: string
  description?: string
  type?: OrderedRitualType | string
  habitIds?: string[]
  isActive?: boolean
  createdAt?: unknown
  updatedAt?: unknown
  [key: string]: unknown
}

type RitualInput = {
  name?: string
  description?: string
  type?: OrderedRitualType | string
  habitIds?: string[]
  isActive?: boolean
}

type RitualCreateRequest = {
  ritual?: RitualInput
}

type RitualUpdateRequest = {
  id?: string
  ritual?: RitualInput
}

type RitualIdRequest = {
  id?: string
}

type HabitDocument = {
  _id: string
  _openid: string
  name?: string
  frequency?: string
  customDays?: number[]
  isArchived?: boolean
  streakCurrent?: number
  streakLongest?: number
  totalCompletions?: number
  [key: string]: unknown
}

type CheckInDocument = {
  _id?: string
  _openid: string
  habitId: string
  date: string
  value?: number | boolean
  createdAt?: unknown
  updatedAt?: unknown
  [key: string]: unknown
}

type ExecuteRequest = {
  ritualId?: string
  completedHabitIds?: string[]
  date?: string
}

type ExecuteErrorEntry = {
  habitId: string
  error: string
}

type ExecuteResult = {
  ritualId: string
  checkIns: CheckInDocument[]
  errors: ExecuteErrorEntry[]
  date: string
}

type RitualEvent = {
  action?: string
  data?: unknown
}

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db: any = cloud.database()
const _: any = db.command
const ritualsCol: any = db.collection('rituals')
const habitsCol: any = db.collection('habits')
const checkInsCol: any = db.collection('check_ins')

function fail<T = unknown>(message: string, data?: T): CloudFailure<T> {
  const res: CloudFailure<T> = { code: -1, message }
  if (data !== undefined) res.data = data
  return res
}

function ok<T>(data: T): CloudSuccess<T> {
  return { code: 0, data }
}

function toDateStr(d: string | Date | number): string {
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d
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

const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/
function isValidDateStr(v: unknown): v is string {
  if (typeof v !== 'string' || !DATE_STR_RE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
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
    const res = await query.skip(skip).limit(PAGE).get()
    const data = ((res as { data?: T[] }).data || []) as T[]
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}

const STREAK_LOOKBACK = 365
const FREEZE_HABIT_ID = '__freeze__'
const SYSTEM_FIELDS = ['_id', '_openid', 'createdAt', 'updatedAt']
const TYPE_ORDER: Record<OrderedRitualType, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
  custom: 3,
}
const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500
const MAX_RITUALS_PER_USER = 50

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

async function list(openid: string): Promise<CloudResponse<RitualDocument[]>> {
  const data = await getList<RitualDocument>(
    ritualsCol.where({ _openid: openid }).orderBy('type', 'asc').limit(100),
  )

  const sorted = [...data].sort((a, b) => {
    const aType = typeof a.type === 'string' ? a.type : ''
    const bType = typeof b.type === 'string' ? b.type : ''
    const aOrder = aType in TYPE_ORDER ? TYPE_ORDER[aType as OrderedRitualType] : 9
    const bOrder = bType in TYPE_ORDER ? TYPE_ORDER[bType as OrderedRitualType] : 9
    return aOrder - bOrder
  })
  return ok(sorted)
}

async function get(openid: string, data: RitualIdRequest = {}): Promise<CloudResponse<RitualDocument & { habits: HabitDocument[] }>> {
  if (!data.id) return fail('缺少仪式 ID')
  let ritual: RitualDocument
  try {
    ritual = await getDoc<RitualDocument>(ritualsCol.doc(data.id))
  } catch {
    return fail('仪式不存在')
  }
  if (ritual._openid !== openid) return fail('无权访问')

  let habits: HabitDocument[] = []
  const habitIds = Array.isArray(ritual.habitIds) ? ritual.habitIds : []
  if (habitIds.length > 0) {
    const habitList = await getList<HabitDocument>(
      habitsCol.where({ _id: _.in(habitIds), _openid: openid }).limit(100),
    )
    const habitMap: Record<string, HabitDocument> = {}
    habitList.forEach((habit) => {
      habitMap[habit._id] = habit
    })
    habits = habitIds
      .map((id) => habitMap[id])
      .filter((habit): habit is HabitDocument => Boolean(habit))
  }

  return ok({ ...ritual, habits })
}

async function create(openid: string, data: RitualCreateRequest = {}): Promise<CloudResponse<RitualDocument>> {
  const ritual: RitualInput | undefined = data.ritual
  if (!ritual) return fail('缺少数据')
  if (!ritual.name) return fail('仪式名称必填')

  const ritualCount = await getCount(ritualsCol.where({ _openid: openid }))
  if (ritualCount >= MAX_RITUALS_PER_USER) return fail('仪式数量已达上限')

  if (ritual.name.length > MAX_NAME_LENGTH) {
    return fail(`仪式名称不能超过 ${MAX_NAME_LENGTH} 个字符`)
  }
  if (ritual.description && ritual.description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`仪式描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`)
  }

  if (!(await checkText(ritual.name, openid, 2))) {
    return fail('仪式名称包含违规内容，请修改后重试')
  }
  if (ritual.description && !(await checkText(ritual.description, openid, 2))) {
    return fail('仪式描述包含违规内容，请修改后重试')
  }

  const now = db.serverDate()
  const record: RitualDocument = {
    ...sanitize(ritual as Record<string, unknown>),
    _openid: openid,
    createdAt: now,
    updatedAt: now,
    isActive: ritual.isActive !== false,
  }

  const _id = await addDoc(ritualsCol, record)
  return ok({ _id, ...record })
}

async function update(openid: string, data: RitualUpdateRequest = {}): Promise<CloudResponse<{ _id: string } & Partial<RitualDocument>>> {
  if (!data.id) return fail('缺少仪式 ID')
  let existing: RitualDocument
  try {
    existing = await getDoc<RitualDocument>(ritualsCol.doc(data.id))
  } catch {
    return fail('仪式不存在')
  }
  if (existing._openid !== openid) return fail('无权操作')

  const ritual: RitualInput = data.ritual || {}
  if (ritual.name && ritual.name.length > MAX_NAME_LENGTH) {
    return fail(`仪式名称不能超过 ${MAX_NAME_LENGTH} 个字符`)
  }
  if (ritual.description && ritual.description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`仪式描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`)
  }

  if (ritual.name && !(await checkText(ritual.name, openid, 2))) {
    return fail('仪式名称包含违规内容，请修改后重试')
  }
  if (ritual.description && !(await checkText(ritual.description, openid, 2))) {
    return fail('仪式描述包含违规内容，请修改后重试')
  }

  const fields = sanitize(ritual as Record<string, unknown>) as Partial<RitualDocument>
  fields.updatedAt = db.serverDate()

  await ritualsCol.doc(data.id).update({ data: fields })
  return ok({ _id: data.id, ...fields })
}

async function remove(openid: string, data: RitualIdRequest = {}): Promise<CloudResponse<{ _id: string }>> {
  if (!data.id) return fail('缺少仪式 ID')
  let existing: RitualDocument
  try {
    existing = await getDoc<RitualDocument>(ritualsCol.doc(data.id))
  } catch {
    return fail('仪式不存在')
  }
  if (existing._openid !== openid) return fail('无权操作')

  await ritualsCol.doc(data.id).remove()
  return ok({ _id: data.id })
}

async function execute(openid: string, data: ExecuteRequest = {}): Promise<CloudResponse<ExecuteResult, ExecuteResult>> {
  const { ritualId, completedHabitIds = [], date } = data
  if (!ritualId) return fail('缺少 ritualId')
  if (!Array.isArray(completedHabitIds) || completedHabitIds.length === 0) {
    return fail('缺少 completedHabitIds')
  }
  if (completedHabitIds.length > 100) return fail('单次执行习惯数量过多')

  const ritual = await getDoc<RitualDocument>(ritualsCol.doc(ritualId))
  if (ritual._openid !== openid) return fail('无权操作')

  const ritualHabitSet = new Set(Array.isArray(ritual.habitIds) ? ritual.habitIds : [])
  const validIds = [...new Set(completedHabitIds)].filter((id) => ritualHabitSet.has(id))
  if (validIds.length === 0) return fail('没有有效的习惯')

  if (date !== undefined && !isValidDateStr(date)) return fail('日期格式不合法')

  const dateStr = date ? toDateStr(date) : toDateStr(new Date())
  const today = toDateStr(new Date())
  const results: CheckInDocument[] = []
  const errors: ExecuteErrorEntry[] = []

  const habitDocs = await getList<HabitDocument>(
    habitsCol.where({ _id: _.in(validIds), _openid: openid }).limit(100),
  )
  const habitMap: Record<string, HabitDocument> = {}
  habitDocs.forEach((habit) => {
    habitMap[habit._id] = habit
  })

  for (const habitId of validIds) {
    const habit = habitMap[habitId]
    if (!habit) {
      errors.push({ habitId, error: 'not_found' })
      continue
    }
    if (habit.isArchived) {
      errors.push({ habitId, error: 'archived' })
      continue
    }

    try {
      const existing = await getList<CheckInDocument>(
        checkInsCol.where({ _openid: openid, habitId, date: dateStr }).limit(1),
      )

      let checkInRecord: CheckInDocument
      let wasNewRecord = false

      if (existing.length > 0) {
        await checkInsCol.doc(existing[0]._id).update({
          data: { value: 1, updatedAt: db.serverDate() },
        })
        checkInRecord = { ...existing[0], value: 1 }
      } else {
        const newRecord: CheckInDocument = {
          _openid: openid,
          habitId,
          date: dateStr,
          value: 1,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        }
        try {
          const _id = await addDoc(checkInsCol, newRecord)
          checkInRecord = { _id, ...newRecord }
          wasNewRecord = true
        } catch (dupErr) {
          const raceExisting = await getList<CheckInDocument>(
            checkInsCol.where({ _openid: openid, habitId, date: dateStr }).limit(1),
          )
          if (raceExisting.length > 0) {
            await checkInsCol.doc(raceExisting[0]._id).update({
              data: { value: 1, updatedAt: db.serverDate() },
            })
            checkInRecord = { ...raceExisting[0], value: 1 }
          } else {
            throw dupErr
          }
        }
        if (wasNewRecord) {
          await habitsCol.doc(habitId).update({
            data: { totalCompletions: _.inc(1) },
          })
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
      const streakCurrent = calcStreak(
        recentDates,
        checkedSet,
        frozenSet,
        habit as Parameters<typeof calcStreak>[3],
        today,
      ) as number

      const updateData: { streakCurrent: number; updatedAt: unknown; streakLongest?: number } = {
        streakCurrent,
        updatedAt: db.serverDate(),
      }
      if (streakCurrent > (habit.streakLongest || 0)) {
        updateData.streakLongest = streakCurrent
      }
      await habitsCol.doc(habitId).update({ data: updateData })

      results.push(checkInRecord)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown'
      console.warn('[ritual.execute] habit failed:', habitId, message)
      errors.push({ habitId, error: message })
    }
  }

  if (results.length === 0 && errors.length > 0) {
    return fail('仪式执行失败', { ritualId, checkIns: results, errors, date: dateStr })
  }
  return ok({ ritualId, checkIns: results, errors, date: dateStr })
}

export async function main(event: RitualEvent = {}, _context?: unknown): Promise<CloudResponse<unknown>> {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action, data } = event
  try {
    switch (action) {
      case 'list':
        return await list(OPENID)
      case 'get':
        return await get(OPENID, (data as RitualIdRequest | undefined) || {})
      case 'create':
        return await create(OPENID, (data as RitualCreateRequest | undefined) || {})
      case 'update':
        return await update(OPENID, (data as RitualUpdateRequest | undefined) || {})
      case 'delete':
        return await remove(OPENID, (data as RitualIdRequest | undefined) || {})
      case 'execute':
        return await execute(OPENID, (data as ExecuteRequest | undefined) || {})
      default:
        return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[ritual/' + action + ']', err)
    return fail('服务器错误，请稍后重试')
  }
}


