const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const usersCol = db.collection('users')

// ── helpers ──────────────────────────────────────────────

function fail(message) {
  return { code: -1, message }
}

function ok(data) {
  return { code: 0, data }
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

// ── actions ──────────────────────────────────────────────

async function login(openid) {
  // 查询是否已有该用户
  const { data: existing } = await usersCol
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.length > 0) {
    return ok(existing[0])
  }

  // 新用户 → 创建默认记录
  const now = db.serverDate()
  const joinDateStr = toDateStr(new Date())
  const newUser = {
    _openid: openid,
    nickName: '习惯者',
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

  return ok(existing[0])
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
      default: return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[' + action + ']', err)
    return fail(err.message || '服务器错误')
  }
}
