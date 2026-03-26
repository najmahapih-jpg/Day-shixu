const cloud = require('wx-server-sdk')
const { normalizeNickName } = require('./nickName')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const usersCol = db.collection('users')

// ── helpers ──────────────────────────────────────────────

function defaultProfileMeta() {
  return {
    source: 'manual',
    wechatAuthorized: false,
    firstLoginPromptDismissed: false,
    manualEditAt: null,
    wechatSyncAt: null,
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
  if (val.length > 2048) {
    console.warn('[user] avatarUrl 超出长度限制 (2048):', val.length, '前50字符:', val.slice(0, 50))
    return ''
  }
  const allowedPrefixes = ['cloud://', 'https://', 'http://', 'wxfile://', 'data:image/']
  if (!allowedPrefixes.some((prefix) => val.startsWith(prefix))) return ''
  return val
}

/** 生成 YYYY-MM-DD 格式日期字符串（东八区/北京时间） */
function toDateStr(d) {
  const dt = typeof d === 'string' ? new Date(d) : d
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── 内容安全检查 ────────────────────────────────────────

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
    console.error('[内容安全检查失败]', err)
    return true
  }
}

// ── actions ──────────────────────────────────────────────

async function login(openid) {
  // 查询是否已有该用户
  const { data: existing } = await usersCol
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.length > 0) {
    const user = existing[0]
    // 懒回填：存量用户无 profileMeta 时补写一次
    if (!user.profileMeta) {
      const meta = defaultProfileMeta()
      await usersCol.doc(user._id).update({
        data: { profileMeta: meta, updatedAt: db.serverDate() },
      })
      user.profileMeta = meta
    }
    return ok(user)
  }

  // 新用户 → 创建默认记录
  const now = db.serverDate()
  const joinDateStr = toDateStr(new Date())
  const newUser = {
    _openid: openid,
    nickName: 'Voyager',
    avatarUrl: '',
    settings: {
      theme: 'neo',
      reduceMotion: false,
      weekStartsOn: 1,
      defaultView: 'timeline',
      notifyEnabled: true,
    },
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
  const { data: existing } = await usersCol
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.length === 0) {
    return { code: 404, message: '用户不存在' }
  }

  const user = existing[0]

  // 懒回填：存量用户无 profileMeta 时补写一次
  if (!user.profileMeta) {
    const meta = defaultProfileMeta()
    await usersCol.doc(user._id).update({
      data: { profileMeta: meta, updatedAt: db.serverDate() },
    })
    user.profileMeta = meta
  }

  return ok(user)
}

async function updateSettings(openid, data) {
  if (!data || !data.settings) return fail('缺少 settings 数据')

  const { data: existing } = await usersCol
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.length === 0) return fail('用户不存在')

  const user = existing[0]

  // 构建局部更新对象
  const updateFields = {}
  Object.keys(data.settings).forEach(key => {
    if (key === 'theme') {
      updateFields['settings.theme'] = 'neo'
      return
    }
    updateFields[`settings.${key}`] = data.settings[key]
  })
  updateFields.updatedAt = db.serverDate()

  await usersCol.doc(user._id).update({ data: updateFields })

  // 返回合并后的完整 settings
  const merged = { ...user.settings, ...data.settings, theme: 'neo' }
  return ok(merged)
}

async function updateAvatar(openid, data) {
  if (!data || typeof data.avatarUrl !== 'string') return fail('缺少 avatarUrl 数据')
  const avatarUrl = normalizeAvatarUrl(data.avatarUrl)
  if (!avatarUrl) return fail('头像地址不合法')

  const { data: existing } = await usersCol
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.length === 0) return fail('用户不存在')
  const user = existing[0]

  await usersCol.doc(user._id).update({
    data: {
      avatarUrl,
      updatedAt: db.serverDate(),
    },
  })

  return ok(avatarUrl)
}

async function updateNickName(openid, data) {
  if (!data || typeof data.nickName !== 'string') return fail('缺少 nickName 数据')
  const nickName = normalizeNickName(data.nickName)
  if (!nickName) return fail('昵称不合法（最多 20 个字符）')

  // 内容安全检查
  if (!(await checkText(nickName, openid, 1))) {
    return fail('昵称包含违规内容，请修改后重试')
  }

  const { data: existing } = await usersCol
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.length === 0) return fail('用户不存在')

  await usersCol.doc(existing[0]._id).update({
    data: { nickName, updatedAt: db.serverDate() },
  })

  return ok(nickName)
}

async function updateProfile(openid, data) {
  if (!data) return fail('缺少 data')

  const { data: existing } = await usersCol
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.length === 0) return fail('用户不存在')

  const user = existing[0]
  const updateFields = { updatedAt: db.serverDate() }
  let hasChanges = false

  if (data.nickName !== undefined) {
    const nick = normalizeNickName(data.nickName)
    if (!nick) return fail('昵称不合法（最多 20 个字符）')
    if (!(await checkText(nick, openid, 1))) {
      return fail('昵称包含违规内容，请修改后重试')
    }
    updateFields.nickName = nick
    hasChanges = true
  }

  if (data.avatarUrl !== undefined) {
    const avatar = normalizeAvatarUrl(data.avatarUrl)
    if (!avatar) return fail('头像地址不合法')
    updateFields.avatarUrl = avatar
    hasChanges = true
  }

  if (!hasChanges) return fail('没有需要更新的字段')

  // profileMeta 来源追踪
  const source = data.source === 'wechat' ? 'wechat' : 'manual'
  const ts = nowISO()

  const baseMeta = user.profileMeta || defaultProfileMeta()
  const mergedMeta = { ...baseMeta, source }
  if (source === 'wechat') {
    mergedMeta.wechatAuthorized = true
    mergedMeta.wechatSyncAt = ts
  } else {
    mergedMeta.manualEditAt = ts
  }
  updateFields.profileMeta = mergedMeta

  await usersCol.doc(user._id).update({ data: updateFields })

  // 返回完整用户文档
  const { data: updated } = await usersCol.doc(user._id).get()
  return ok(updated)
}

async function dismissWechatProfilePrompt(openid) {
  const { data: existing } = await usersCol
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.length === 0) return fail('用户不存在')

  const user = existing[0]
  const baseMeta = user.profileMeta || defaultProfileMeta()
  const mergedMeta = { ...baseMeta, firstLoginPromptDismissed: true }

  await usersCol.doc(user._id).update({
    data: { profileMeta: mergedMeta, updatedAt: db.serverDate() },
  })
  return ok(true)
}

// ── main ─────────────────────────────────────────────────

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action, data } = event
  try {
    switch (action) {
      case 'login': return await login(OPENID)
      case 'getProfile': return await getProfile(OPENID)
      case 'updateSettings': return await updateSettings(OPENID, data)
      case 'updateAvatar': return await updateAvatar(OPENID, data)
      case 'updateNickName': return await updateNickName(OPENID, data)
      case 'updateProfile': return await updateProfile(OPENID, data)
      case 'dismissWechatProfilePrompt': return await dismissWechatProfilePrompt(OPENID)
      default: return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[' + action + ']', err)
    return fail(err.message || '服务器错误')
  }
}
