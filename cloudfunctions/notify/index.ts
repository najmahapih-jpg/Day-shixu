import cloud = require('wx-server-sdk')
import type { CloudResult } from '../_shared/cloud-types'

type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'
type NotifyAction = 'scheduledRemind'

type ScheduledRemindInput = Record<string, never>

type NotifyEvent = {
  Type?: string
  action?: NotifyAction | string
  data?: ScheduledRemindInput
}

type ReminderHabitDocument = {
  _id?: string
  _openid?: string
  name?: string
  frequency?: HabitFrequency | string
  customDays?: number[]
  isArchived?: boolean
  reminderTime?: string
} & Record<string, unknown>

type UserSettingsDocument = {
  notifyEnabled?: boolean
}

type UserDocument = {
  _id?: string
  _openid?: string
  settings?: UserSettingsDocument
} & Record<string, unknown>

type SubscribeMessagePayload = {
  touser: string
  templateId: string
  page: string
  data: {
    thing1: { value: string }
    time2: { value: string }
    thing3: { value: string }
  }
}

type NotifyErrorEntry = {
  openid: string
  error: string | number
}

type NotifyResult = {
  sent: number
  total: number
}

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db: any = cloud.database()
const _: any = db.command
const habitsCol: any = db.collection('habits')
const usersCol: any = db.collection('users')

function fail<T = unknown>(message: string, data?: T): Extract<CloudResult<never>, { code: -1 }> {
  const result: Extract<CloudResult<never>, { code: -1 }> = { code: -1, message }
  if (data !== undefined) {
    ;(result as { data?: T }).data = data
  }
  return result
}

function ok<T>(data: T): Extract<CloudResult<T>, { code: 0 }> {
  return { code: 0, data }
}

function getCurrentHHmm(): string {
  const now = new Date()
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000)
  const hours = String(utc8.getUTCHours()).padStart(2, '0')
  const minutes = String(utc8.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function getCurrentDow(): number {
  const now = new Date()
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000)
  return utc8.getUTCDay()
}

function shouldRemindToday(habit: ReminderHabitDocument, dow: number): boolean {
  const freq = habit.frequency
  if (freq === 'daily') return true
  if (freq === 'weekdays') return dow >= 1 && dow <= 5
  if (freq === 'weekends') return dow === 0 || dow === 6
  if (freq === 'custom' && Array.isArray(habit.customDays)) {
    const wd1to7 = dow === 0 ? 7 : dow
    return habit.customDays.includes(wd1to7)
  }
  return false
}

async function getList<T>(query: any): Promise<T[]> {
  const res = await query.get()
  return ((res as { data?: T[] }).data || []) as T[]
}

async function scheduledRemind(_input: ScheduledRemindInput = {}): Promise<CloudResult<NotifyResult>> {
  const currentTime = getCurrentHHmm()
  const dow = getCurrentDow()

  const [hour, minute] = currentTime.split(':').map(Number)
  const endMin = Math.min(hour * 60 + minute + 29, 23 * 60 + 59)
  const endH = String(Math.floor(endMin / 60)).padStart(2, '0')
  const endM = String(endMin % 60).padStart(2, '0')
  const windowEnd = `${endH}:${endM}`

  const PAGE = 100
  let habits: ReminderHabitDocument[] = []
  let skip = 0
  while (true) {
    const page = await getList<ReminderHabitDocument>(
      habitsCol
        .where({
          isArchived: _.neq(true),
          reminderTime: _.gte(currentTime).and(_.lte(windowEnd)),
        })
        .skip(skip)
        .limit(PAGE),
    )
    habits = habits.concat(page)
    if (page.length < PAGE) break
    skip += PAGE
  }

  if (habits.length === 0) {
    return ok({ sent: 0, total: 0 })
  }

  const userHabitsMap: Record<string, ReminderHabitDocument[]> = {}
  for (const habit of habits) {
    if (!shouldRemindToday(habit, dow)) continue
    const openid = habit._openid
    if (!openid) continue
    if (!userHabitsMap[openid]) {
      userHabitsMap[openid] = []
    }
    userHabitsMap[openid].push(habit)
  }

  const openids = Object.keys(userHabitsMap)
  if (openids.length === 0) {
    return ok({ sent: 0, total: 0 })
  }

  const notifyDisabled = new Set<string>()
  for (let index = 0; index < openids.length; index += PAGE) {
    const batch = openids.slice(index, index + PAGE)
    const users = await getList<UserDocument>(
      usersCol
        .where({ _openid: _.in(batch) })
        .field({ _openid: true, settings: true })
        .limit(PAGE),
    )
    for (const user of users) {
      if (user.settings && user.settings.notifyEnabled === false && user._openid) {
        notifyDisabled.add(user._openid)
      }
    }
  }

  let sent = 0
  const errors: NotifyErrorEntry[] = []

  for (const [openid, userHabits] of Object.entries(userHabitsMap) as Array<[string, ReminderHabitDocument[]]>) {
    if (notifyDisabled.has(openid)) continue

    const firstHabit = userHabits[0]
    const habitNames = userHabits.map((habit) => String(habit.name || '')).join('、')
    const displayName = habitNames.length > 18 ? habitNames.slice(0, 18) + '...' : habitNames

    try {
      const payload: SubscribeMessagePayload = {
        touser: openid,
        templateId: 'vRh8S5mGFwJRclVVnG8pqK4l1wT1kXtjNzfp0xt20K0',
        page: 'pages/index/index',
        data: {
          thing1: { value: displayName },
          time2: { value: String(firstHabit.reminderTime || currentTime) },
          thing3: { value: '记得完成今天的习惯哦' },
        },
      }
      await cloud.openapi.subscribeMessage.send(payload)
      sent++
    } catch (err) {
      const error = err as { errCode?: number; message?: string }
      if (error.errCode !== 43101) {
        errors.push({ openid, error: error.message || error.errCode || 'unknown' })
      }
    }
  }

  if (errors.length > 0) {
    console.warn('[notify] 部分发送失败:', JSON.stringify(errors.slice(0, 10)))
  }

  return ok({ sent, total: Object.keys(userHabitsMap).length })
}

export async function main(event: NotifyEvent = {}, _context?: unknown): Promise<CloudResult<NotifyResult>> {
  const { OPENID } = cloud.getWXContext()
  if (OPENID) return fail('该接口不支持直接调用')
  if (!event || event.Type !== 'Timer') {
    console.warn('[notify] rejected: missing Timer trigger metadata', { type: event && event.Type })
    return fail('仅支持定时触发器调用')
  }

  const { action, data } = event
  try {
    if (!action || action === 'scheduledRemind') {
      return await scheduledRemind(data || {})
    }
    return fail('未知操作: ' + action)
  } catch (err) {
    console.error('[notify]', err)
    return fail('服务器错误，请稍后重试')
  }
}
