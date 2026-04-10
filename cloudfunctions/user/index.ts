import cloud = require('wx-server-sdk')
import type { CloudFailure, CloudResult, CloudSuccess } from '../_shared/cloud-types'
import { normalizeNickName } from './nickName'

type Theme = 'neo'
type WeekStartsOn = 0 | 1

type UserSettingsDocument = {
  theme: Theme
  reduceMotion: boolean
  weekStartsOn: WeekStartsOn
  notifyEnabled: boolean
  defaultView?: unknown
} & Record<string, unknown>

type UserStatsDocument = {
  joinDate: string
  totalCheckIns: number
  currentStreak: number
  longestStreak: number
} & Record<string, unknown>

type ProfileMetaDocument = {
  wechatAuthorized: boolean
  wechatSyncAt: string | null
  source?: string
  firstLoginPromptDismissed?: boolean
  manualEditAt?: string
} & Record<string, unknown>

type UserDocument = {
  _id?: string
  _openid: string
  nickName: string
  avatarUrl: string
  settings: UserSettingsDocument
  stats: UserStatsDocument
  profileMeta?: ProfileMetaDocument
  createdAt?: unknown
  updatedAt?: unknown
} & Record<string, unknown>

type UpdateSettingsPayload = {
  settings?: Record<string, unknown>
}

type SyncWechatProfilePayload = {
  nickName?: string
  avatarUrl?: string
}

type UserAction = 'login' | 'getProfile' | 'updateSettings' | 'syncWechatProfile'

type UserEvent = {
  action?: string
  data?: unknown
}

type NotFoundResult = {
  code: 404
  message: string
}

type UserCloudResult<T> = CloudResult<T> | NotFoundResult

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db: any = cloud.database()
const usersCol: any = db.collection('users')
const LEGACY_PLACEHOLDER_NICK_NAMES = new Set(['习惯者', 'Voyager', '用户', '微信用户'])

function defaultProfileMeta(): ProfileMetaDocument {
  return {
    wechatAuthorized: false,
    wechatSyncAt: null,
  }
}

function defaultSettings(): UserSettingsDocument {
  return {
    theme: 'neo',
    reduceMotion: false,
    weekStartsOn: 1,
    notifyEnabled: true,
  }
}

function nowISO(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString()
}

function fail(message: string): CloudFailure {
  return { code: -1, message }
}

function ok<T>(data: T): CloudSuccess<T> {
  return { code: 0, data }
}

function normalizeAvatarUrl(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const val = raw.trim()
  if (!val) return ''
  if (val.length > 2048) return ''

  const allowedPrefixes = ['cloud://', 'https://', 'http://', 'wxfile://']
  if (!allowedPrefixes.some((prefix) => val.startsWith(prefix))) return ''
  return val
}

function toDateStr(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function hasMeaningfulNickName(raw: unknown): boolean {
  const nick = normalizeNickName(raw)
  if (!nick) return false
  return !LEGACY_PLACEHOLDER_NICK_NAMES.has(nick)
}

function hasSyncedWechatAvatar(user: Partial<UserDocument> | null | undefined): boolean {
  const avatarUrl = normalizeAvatarUrl(user && user.avatarUrl)
  return Boolean(avatarUrl)
}

function normalizeProfileMeta(user: Partial<UserDocument> | null | undefined): ProfileMetaDocument {
  const rawMeta: Partial<ProfileMetaDocument> = (user && user.profileMeta) || {}
  const meta = defaultProfileMeta()

  if (rawMeta.wechatAuthorized === true) {
    meta.wechatAuthorized = true
  }
  if (typeof rawMeta.wechatSyncAt === 'string' && rawMeta.wechatSyncAt.trim()) {
    meta.wechatSyncAt = rawMeta.wechatSyncAt.trim()
  }

  if (!meta.wechatAuthorized && rawMeta.source === 'wechat' && hasSyncedWechatAvatar(user)) {
    meta.wechatAuthorized = true
    meta.wechatSyncAt = meta.wechatSyncAt || nowISO()
  }

  if (!meta.wechatAuthorized) {
    meta.wechatSyncAt = null
  }

  return meta
}

function profileMetaNeedsMigration(
  user: Partial<UserDocument> | null | undefined,
  normalizedMeta: ProfileMetaDocument,
): boolean {
  const rawMeta = user && user.profileMeta
  if (!rawMeta) return true
  if ('source' in rawMeta || 'firstLoginPromptDismissed' in rawMeta || 'manualEditAt' in rawMeta) {
    return true
  }
  return (
    rawMeta.wechatAuthorized !== normalizedMeta.wechatAuthorized ||
    (rawMeta.wechatSyncAt || null) !== normalizedMeta.wechatSyncAt
  )
}

function normalizeSettings(rawSettings: Partial<UserSettingsDocument> | null | undefined): UserSettingsDocument {
  const raw = rawSettings || {}
  return {
    theme: 'neo',
    reduceMotion: raw.reduceMotion === true,
    weekStartsOn: raw.weekStartsOn === 0 ? 0 : 1,
    notifyEnabled: raw.notifyEnabled !== false,
  }
}

function settingsNeedMigration(
  rawSettings: Partial<UserSettingsDocument> | null | undefined,
  normalizedSettings: UserSettingsDocument,
): boolean {
  if (!rawSettings) return true
  if (Object.prototype.hasOwnProperty.call(rawSettings, 'defaultView')) {
    return true
  }

  return (
    rawSettings.theme !== normalizedSettings.theme ||
    rawSettings.reduceMotion !== normalizedSettings.reduceMotion ||
    rawSettings.weekStartsOn !== normalizedSettings.weekStartsOn ||
    rawSettings.notifyEnabled !== normalizedSettings.notifyEnabled
  )
}

async function normalizeUserDocument(user: UserDocument): Promise<UserDocument> {
  const normalizedMeta = normalizeProfileMeta(user)
  const normalizedSettings = normalizeSettings(user.settings)
  const updateData: Record<string, unknown> = {}

  if (profileMetaNeedsMigration(user, normalizedMeta)) {
    updateData.profileMeta = normalizedMeta
  }
  if (settingsNeedMigration(user.settings, normalizedSettings)) {
    updateData.settings = normalizedSettings
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = db.serverDate()
    await usersCol.doc(user._id).update({ data: updateData })
  }

  return {
    ...user,
    settings: normalizedSettings,
    profileMeta: normalizedMeta,
  }
}

async function checkText(content: unknown, openid: string, scene: number): Promise<boolean> {
  if (!content || typeof content !== 'string' || !content.trim()) return true

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: content.trim().slice(0, 2500),
      version: 2,
      scene: scene || 1,
      openid,
    })
    return res.result.suggest !== 'risky'
  } catch (err) {
    console.error('[msgSecCheck]', err)
    return true
  }
}

async function findUserByOpenid(openid: string): Promise<UserDocument | null> {
  const result = await usersCol.where({ _openid: openid }).limit(1).get()
  const data = ((result as { data?: UserDocument[] }).data || []) as UserDocument[]
  return data[0] || null
}

async function login(openid: string): Promise<CloudResult<UserDocument>> {
  const existingUser = await findUserByOpenid(openid)
  if (existingUser) {
    return ok(await normalizeUserDocument(existingUser))
  }

  const now = db.serverDate()
  const joinDateStr = toDateStr(new Date())
  const newUser: UserDocument = {
    _openid: openid,
    nickName: '',
    avatarUrl: '',
    settings: defaultSettings(),
    stats: {
      joinDate: joinDateStr,
      totalCheckIns: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
    profileMeta: defaultProfileMeta(),
    createdAt: now,
    updatedAt: now,
  }

  const result = await usersCol.add({ data: newUser })
  const _id = String((result as { _id: string })._id)
  return ok({ _id, ...newUser })
}

async function getProfile(openid: string): Promise<UserCloudResult<UserDocument>> {
  const user = await findUserByOpenid(openid)
  if (!user) {
    return { code: 404, message: '用户不存在' }
  }

  return ok(await normalizeUserDocument(user))
}

const SETTINGS_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  reduceMotion: (value) => typeof value === 'boolean',
  weekStartsOn: (value) => value === 0 || value === 1,
  notifyEnabled: (value) => typeof value === 'boolean',
  theme: () => true,
}

async function updateSettings(openid: string, data?: UpdateSettingsPayload): Promise<CloudResult<UserSettingsDocument>> {
  if (!data || !data.settings) return fail('缺少 settings 数据')

  const user = await findUserByOpenid(openid)
  if (!user) return fail('用户不存在')

  for (const key of Object.keys(data.settings)) {
    const validator = SETTINGS_VALIDATORS[key]
    if (validator && !validator(data.settings[key])) {
      return fail(`设置项 ${key} 的值不合法`)
    }
  }

  const supportedIncoming: Partial<UserSettingsDocument> = {}
  Object.keys(data.settings).forEach((key) => {
    if (key === 'theme') {
      supportedIncoming.theme = 'neo'
      return
    }
    if (key in SETTINGS_VALIDATORS) {
      ;(supportedIncoming as Record<string, unknown>)[key] = data.settings?.[key]
    }
  })

  const merged = normalizeSettings({ ...user.settings, ...supportedIncoming })

  await usersCol.doc(user._id).update({
    data: {
      settings: merged,
      updatedAt: db.serverDate(),
    },
  })

  return ok(merged)
}

async function syncWechatProfile(
  openid: string,
  data?: SyncWechatProfilePayload,
): Promise<CloudResult<UserDocument>> {
  if (!data) return fail('缺少 data')

  const user = await findUserByOpenid(openid)
  if (!user) return fail('用户不存在')

  const updateFields: Record<string, unknown> = { updatedAt: db.serverDate() }
  const normalizedMeta = normalizeProfileMeta(user)
  let hasChanges = false
  let avatarUpdated = false

  if (typeof data.nickName === 'string') {
    const rawNick = data.nickName.trim()
    if (rawNick) {
      const nick = normalizeNickName(rawNick)
      if (!nick) return fail('昵称不合法（最多 20 个字符）')
      if (!(await checkText(nick, openid, 1))) {
        return fail('昵称包含违规内容，请修改后重试')
      }
      updateFields.nickName = nick
      hasChanges = true
    }
  }

  if (typeof data.avatarUrl === 'string') {
    const rawAvatar = data.avatarUrl.trim()
    if (rawAvatar) {
      const avatar = normalizeAvatarUrl(rawAvatar)
      if (!avatar) return fail('头像地址不合法')
      updateFields.avatarUrl = avatar
      hasChanges = true
      avatarUpdated = true
    }
  }

  if (!hasChanges) return fail('没有可保存的头像或昵称')

  const effectiveAvatarUrl = normalizeAvatarUrl(
    String((updateFields.avatarUrl as string | undefined) || user.avatarUrl),
  )
  updateFields.profileMeta = {
    ...normalizedMeta,
    wechatAuthorized: Boolean(effectiveAvatarUrl),
    wechatSyncAt: effectiveAvatarUrl
      ? (avatarUpdated ? nowISO() : (normalizedMeta.wechatSyncAt || nowISO()))
      : null,
  }

  await usersCol.doc(user._id).update({ data: updateFields })

  const result = await usersCol.doc(user._id).get()
  const updated = (result as { data: UserDocument }).data
  return ok(await normalizeUserDocument(updated))
}

export async function main(event: UserEvent = {}): Promise<UserCloudResult<unknown>> {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action, data } = event

  try {
    switch (action as UserAction) {
      case 'login':
        return await login(OPENID)
      case 'getProfile':
        return await getProfile(OPENID)
      case 'updateSettings':
        return await updateSettings(OPENID, data as UpdateSettingsPayload | undefined)
      case 'syncWechatProfile':
        return await syncWechatProfile(OPENID, data as SyncWechatProfilePayload | undefined)
      default:
        return fail('未知操作')
    }
  } catch (err) {
    console.error(`[${action}]`, err)
    return fail('服务器错误，请稍后重试')
  }
}
