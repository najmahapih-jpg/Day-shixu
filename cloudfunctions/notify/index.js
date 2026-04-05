const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const habitsCol = db.collection('habits')
const usersCol = db.collection('users')

// ── helpers ──────────────────────────────────────────────

function fail(message) {
  return { code: -1, message }
}

function ok(data) {
  return { code: 0, data }
}

/**
 * 获取东八区 HH:mm 格式时间字符串
 */
function getCurrentHHmm() {
  const now = new Date()
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000)
  const h = String(utc8.getUTCHours()).padStart(2, '0')
  const m = String(utc8.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/**
 * 获取东八区星期几 (0=日, 1=一, ..., 6=六)
 */
function getCurrentDow() {
  const now = new Date()
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000)
  return utc8.getUTCDay()
}

/**
 * 判断某个习惯今天是否应提醒
 */
function shouldRemindToday(habit, dow) {
  const freq = habit.frequency
  if (freq === 'daily') return true
  if (freq === 'weekdays') return dow >= 1 && dow <= 5
  if (freq === 'weekends') return dow === 0 || dow === 6
  if (freq === 'custom' && Array.isArray(habit.customDays)) {
    // customDays uses 1-7 convention (1=Mon, 7=Sun), convert JS 0-6 to match
    const wd1to7 = dow === 0 ? 7 : dow
    return habit.customDays.includes(wd1to7)
  }
  return false
}

// ── actions ──────────────────────────────────────────────

/**
 * scheduledRemind — 由定时触发器调用
 * 查询当前时间段需要提醒的习惯，发送订阅消息
 *
 * config.json 中定义触发频率: 每 30 分钟一次 (7:00 - 23:00)
 * 匹配逻辑: habit.reminderTime 在 [currentHH:mm, currentHH:mm + 29min] 窗口内
 */
async function scheduledRemind() {
  const currentTime = getCurrentHHmm()
  const dow = getCurrentDow()

  // 计算当前 30 分钟窗口的结束时间 (clamped to 23:59)
  const [h, m] = currentTime.split(':').map(Number)
  const endMin = Math.min(h * 60 + m + 29, 23 * 60 + 59)
  const endH = String(Math.floor(endMin / 60)).padStart(2, '0')
  const endM = String(endMin % 60).padStart(2, '0')
  const windowEnd = `${endH}:${endM}`

  // 分页查询所有未归档、有提醒时间的习惯（wx-server-sdk 单次上限 100 条）
  const PAGE = 100
  let habits = []
  let skip = 0
  while (true) {
    const { data } = await habitsCol
      .where({
        isArchived: _.neq(true),
        reminderTime: _.gte(currentTime).and(_.lte(windowEnd)),
      })
      .skip(skip)
      .limit(PAGE)
      .get()
    habits = habits.concat(data)
    if (data.length < PAGE) break
    skip += PAGE
  }

  if (habits.length === 0) {
    return ok({ sent: 0, total: 0 })
  }

  // 按用户分组
  const userHabitsMap = {}
  for (const habit of habits) {
    if (!shouldRemindToday(habit, dow)) continue
    const openid = habit._openid
    if (!openid) continue
    if (!userHabitsMap[openid]) {
      userHabitsMap[openid] = []
    }
    userHabitsMap[openid].push(habit)
  }

  // 过滤已关闭通知的用户
  const openids = Object.keys(userHabitsMap)
  if (openids.length === 0) {
    return ok({ sent: 0, total: 0 })
  }

  // 分页获取用户通知设置（同样受 100 条限制）
  const notifyDisabled = new Set()
  for (let i = 0; i < openids.length; i += PAGE) {
    const batch = openids.slice(i, i + PAGE)
    const { data: users } = await usersCol
      .where({ _openid: _.in(batch) })
      .field({ _openid: true, settings: true })
      .limit(PAGE)
      .get()
    for (const u of users) {
      if (u.settings && u.settings.notifyEnabled === false) {
        notifyDisabled.add(u._openid)
      }
    }
  }

  let sent = 0
  const errors = []

  for (const [openid, userHabits] of Object.entries(userHabitsMap)) {
    if (notifyDisabled.has(openid)) continue
    // 取第一个习惯作为主提醒（订阅消息模板有字数限制）
    const firstHabit = userHabits[0]
    const habitNames = userHabits.map((h) => h.name).join('、')
    const displayName =
      habitNames.length > 18 ? habitNames.slice(0, 18) + '...' : habitNames

    try {
      // Keep in sync with SUBSCRIBE_TEMPLATE_IDS.DAILY_CHECK_IN in utils/constants.ts
      const TEMPLATE_ID = 'vRh8S5mGFwJRclVVnG8pqK4l1wT1kXtjNzfp0xt20K0'
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId: TEMPLATE_ID,
        page: 'pages/index/index',
        data: {
          thing1: { value: displayName },         // 习惯名称
          time2: { value: firstHabit.reminderTime }, // 提醒时间
          thing3: { value: '记得完成今天的习惯哦' },   // 备注
        },
      })
      sent++
    } catch (err) {
      // 用户未授权订阅或订阅次数用尽 — 静默跳过
      if (err.errCode !== 43101) {
        errors.push({ openid, error: err.message || err.errCode })
      }
    }
  }

  if (errors.length > 0) {
    console.warn('[notify] 部分发送失败:', JSON.stringify(errors.slice(0, 10)))
  }

  return ok({ sent, total: Object.keys(userHabitsMap).length })
}

// ── main ─────────────────────────────────────────────────

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  // 正向校验：仅允许定时触发器调用
  //   1) 必须没有 OPENID（用户直接调用会携带 OPENID）
  //   2) 必须带 event.Type === 'Timer'（定时触发器由微信云平台注入）
  // 两条件都满足才放行，否则失败关闭 (fail-closed)
  if (OPENID) return fail('该接口不支持直接调用')
  if (!event || event.Type !== 'Timer') {
    console.warn('[notify] rejected: missing Timer trigger metadata', { type: event && event.Type })
    return fail('仅支持定时触发器调用')
  }

  const { action } = event
  try {
    if (!action || action === 'scheduledRemind') {
      return await scheduledRemind()
    }
    return fail('未知操作: ' + action)
  } catch (err) {
    console.error('[notify]', err)
    return fail('服务器错误，请稍后重试')
  }
}
