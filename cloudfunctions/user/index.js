const cloud = require('wx-server-sdk')
const { normalizeNickName } = require('./nickName')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const usersCol = db.collection('users')
const LEGACY_PLACEHOLDER_NICK_NAMES = new Set(['习惯者', 'Voyager', '用户', '微信用户'])

function defaultProfileMeta() {
  return {
    wechatAuthorized: false,
    wechatSyncAt: null,
  }
}

function defaultSettings() {
  return {
    theme: 'neo',
    reduceMotion: false,
    weekStartsOn: 1,
    notifyEnabled: true,
  }
}

function nowISO() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString()
}

function fail(message) {
  return { code: -1, message }
}

function ok(data) {
  return { code: 0, data }
}

function normalizeAvatarUrl(raw) {
  if (typeof raw !== 'string') return ''
  const val = raw.trim()
  if (!val) return ''
  if (val.length > 2048) return ''

  const allowedPrefixes = ['cloud://', 'https://', 'http://', 'wxfile://', 'data:image/']
  if (!allowedPrefixes.some((prefix) => val.startsWith(prefix))) return ''
  return val
}

function toDateStr(d) {
  const dt = typeof d === 'string' ? new Date(d) : d
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function hasMeaningfulNickName(raw) {
  const nick = normalizeNickName(raw)
  if (!nick) return false
  return !LEGACY_PLACEHOLDER_NICK_NAMES.has(nick)
}

function hasSyncedWechatAvatar(user) {
  const avatarUrl = normalizeAvatarUrl(user && user.avatarUrl)
  return Boolean(avatarUrl)
}

function normalizeProfileMeta(user) {
  const rawMeta = (user && user.profileMeta) || {}
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

function profileMetaNeedsMigration(user, normalizedMeta) {
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

function normalizeSettings(rawSettings) {
  const raw = rawSettings || {}
  return {
    theme: 'neo',
    reduceMotion: raw.reduceMotion === true,
    weekStartsOn: raw.weekStartsOn === 0 ? 0 : 1,
    notifyEnabled: raw.notifyEnabled !== false,
  }
}

function settingsNeedMigration(rawSettings, normalizedSettings) {
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

async function normalizeUserDocument(user) {
  const normalizedMeta = normalizeProfileMeta(user)
  const normalizedSettings = normalizeSettings(user.settings)
  const updateData = {}

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

async function checkText(content, openid, scene) {
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

async function findUserByOpenid(openid) {
  const { data } = await usersCol.where({ _openid: openid }).limit(1).get()
  return data[0] || null
}

async function login(openid) {
  const existingUser = await findUserByOpenid(openid)
  if (existingUser) {
    return ok(await normalizeUserDocument(existingUser))
  }

  const now = db.serverDate()
  const joinDateStr = toDateStr(new Date())
  const newUser = {
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

  const { _id } = await usersCol.add({ data: newUser })
  return ok({ _id, ...newUser })
}

async function getProfile(openid) {
  const user = await findUserByOpenid(openid)
  if (!user) {
    return { code: 404, message: '用户不存在' }
  }

  return ok(await normalizeUserDocument(user))
}

/**
 * Settings value validation map.
 * Each known key has a validator — if the value is invalid the entire request fails.
 * Unknown keys are silently ignored for forward compatibility.
 */
const SETTINGS_VALIDATORS = {
  reduceMotion: (v) => typeof v === 'boolean',
  weekStartsOn: (v) => v === 0 || v === 1,
  notifyEnabled: (v) => typeof v === 'boolean',
  theme: () => true, // always coerced to 'neo'
}

async function updateSettings(openid, data) {
  if (!data || !data.settings) return fail('缺少 settings 数据')

  const user = await findUserByOpenid(openid)
  if (!user) return fail('用户不存在')

  // Validate all known keys first — reject entire request on any invalid value
  for (const key of Object.keys(data.settings)) {
    const validator = SETTINGS_VALIDATORS[key]
    if (validator && !validator(data.settings[key])) {
      return fail(`设置项 ${key} 的值不合法`)
    }
  }

  const supportedIncoming = {}
  Object.keys(data.settings).forEach((key) => {
    if (key === 'theme') {
      supportedIncoming.theme = 'neo'
      return
    }
    if (key in SETTINGS_VALIDATORS) {
      supportedIncoming[key] = data.settings[key]
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

async function syncWechatProfile(openid, data) {
  if (!data) return fail('缺少 data')

  const user = await findUserByOpenid(openid)
  if (!user) return fail('用户不存在')

  const updateFields = { updatedAt: db.serverDate() }
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

  const effectiveAvatarUrl = normalizeAvatarUrl(updateFields.avatarUrl || user.avatarUrl)
  updateFields.profileMeta = {
    ...normalizedMeta,
    wechatAuthorized: Boolean(effectiveAvatarUrl),
    wechatSyncAt: effectiveAvatarUrl
      ? (avatarUpdated ? nowISO() : (normalizedMeta.wechatSyncAt || nowISO()))
      : null,
  }

  await usersCol.doc(user._id).update({ data: updateFields })

  const { data: updated } = await usersCol.doc(user._id).get()
  return ok(await normalizeUserDocument(updated))
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action, data } = event

  try {
    switch (action) {
      case 'login':
        return await login(OPENID)
      case 'getProfile':
        return await getProfile(OPENID)
      case 'updateSettings':
        return await updateSettings(OPENID, data)
      case 'syncWechatProfile':
        return await syncWechatProfile(OPENID, data)
      default:
        return fail('未知操作')
    }
  } catch (err) {
    console.error(`[${action}]`, err)
    return fail('服务器错误，请稍后重试')
  }
}
