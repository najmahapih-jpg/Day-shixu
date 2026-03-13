const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const ritualsCol = db.collection('rituals')
const habitsCol = db.collection('habits')
const checkInsCol = db.collection('check_ins')

// ── helpers ──────────────────────────────────────────────

function fail(message) {
  return { code: -1, message }
}

function ok(data) {
  return { code: 0, data }
}

function toDateStr(d) {
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
  const dt = typeof d === 'string' ? new Date(d) : d
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function getRecentDates(baseDate, n) {
  const dates = []
  const base = parseDate(toDateStr(baseDate))
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setUTCDate(d.getUTCDate() - i)
    dates.push(toDateStr(d))
  }
  return dates
}

function calcStreak(recentDates, checkedDateSet) {
  let streak = 0
  for (const date of recentDates) {
    if (checkedDateSet.has(date)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

const SYSTEM_FIELDS = ['_id', '_openid', 'createdAt', 'updatedAt']
function sanitize(obj) {
  const cleaned = {}
  Object.keys(obj).forEach(key => {
    if (!SYSTEM_FIELDS.includes(key)) cleaned[key] = obj[key]
  })
  return cleaned
}

// ── actions ──────────────────────────────────────────────

const TYPE_ORDER = { morning: 0, afternoon: 1, evening: 2, custom: 3 }

async function list(openid) {
  const { data } = await ritualsCol
    .where({ _openid: openid })
    .orderBy('type', 'asc')
    .limit(100)
    .get()

  // 二次排序：按 type 分组顺序
  const sorted = [...data].sort((a, b) => {
    const aOrder = TYPE_ORDER[a.type] === undefined || TYPE_ORDER[a.type] === null ? 9 : TYPE_ORDER[a.type]
    const bOrder = TYPE_ORDER[b.type] === undefined || TYPE_ORDER[b.type] === null ? 9 : TYPE_ORDER[b.type]
    return aOrder - bOrder
  })
  return ok(sorted)
}

async function get(openid, event) {
  if (!event.id) return fail('缺少仪式 ID')
  const { data: ritual } = await ritualsCol.doc(event.id).get()
  if (ritual._openid !== openid) return fail('无权访问')

  // 关联查询习惯详情
  let habits = []
  if (ritual.habitIds && ritual.habitIds.length > 0) {
    const { data: habitList } = await habitsCol
      .where({ _id: _.in(ritual.habitIds), _openid: openid })
      .limit(100)
      .get()
    // 按 habitIds 顺序排列
    const habitMap = {}
    habitList.forEach(h => { habitMap[h._id] = h })
    habits = ritual.habitIds
      .map(id => habitMap[id])
      .filter(Boolean)
  }

  return ok({ ...ritual, habits })
}

async function create(openid, event) {
  const ritual = event.ritual
  if (!ritual) return fail('缺少数据')
  if (!ritual.name) return fail('仪式名称必填')

  const now = db.serverDate()
  const record = {
    ...sanitize(ritual),
    _openid: openid,
    createdAt: now,
    updatedAt: now,
    isActive: ritual.isActive !== false,
  }

  const { _id } = await ritualsCol.add({ data: record })
  return ok({ _id, ...record })
}

async function update(openid, event) {
  if (!event.id) return fail('缺少仪式 ID')
  const { data: existing } = await ritualsCol.doc(event.id).get()
  if (existing._openid !== openid) return fail('无权操作')

  const fields = sanitize(event.ritual || {})
  fields.updatedAt = db.serverDate()

  await ritualsCol.doc(event.id).update({ data: fields })
  return ok({ _id: event.id, ...fields })
}

async function remove(openid, event) {
  if (!event.id) return fail('缺少仪式 ID')
  const { data: existing } = await ritualsCol.doc(event.id).get()
  if (existing._openid !== openid) return fail('无权操作')

  await ritualsCol.doc(event.id).remove()
  return ok({ _id: event.id })
}

async function execute(openid, event) {
  const { ritualId, completedHabitIds, date } = event
  if (!ritualId) return fail('缺少 ritualId')
  if (!Array.isArray(completedHabitIds) || completedHabitIds.length === 0) {
    return fail('缺少 completedHabitIds')
  }
  if (completedHabitIds.length > 100) return fail('单次执行习惯数量过多')

  // 校验仪式归属
  const { data: ritual } = await ritualsCol.doc(ritualId).get()
  if (ritual._openid !== openid) return fail('无权操作')

  // 去重 + 校验 habitIds 属于该仪式
  const ritualHabitSet = new Set(ritual.habitIds || [])
  const validIds = [...new Set(completedHabitIds)].filter(id => ritualHabitSet.has(id))
  if (validIds.length === 0) return fail('没有有效的习惯')

  const dateStr = date ? toDateStr(date) : toDateStr(new Date())
  const results = []

  // 逐个处理打卡
  for (const habitId of validIds) {
    // 校验习惯存在且归属当前用户
    let habit
    try {
      const res = await habitsCol.doc(habitId).get()
      habit = res.data
    } catch (e) {
      continue // 习惯不存在，跳过
    }
    if (!habit || habit._openid !== openid) continue

    // 查是否已有打卡记录
    const { data: existing } = await checkInsCol
      .where({ _openid: openid, habitId, date: dateStr })
      .limit(1)
      .get()

    let checkInRecord
    if (existing.length > 0) {
      // 已存在 → 更新
      await checkInsCol.doc(existing[0]._id).update({
        data: { value: 1, updatedAt: db.serverDate() }
      })
      checkInRecord = { ...existing[0], value: 1 }
    } else {
      // 不存在 → 创建
      const newRecord = {
        _openid: openid,
        habitId,
        date: dateStr,
        value: 1,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
      const { _id } = await checkInsCol.add({ data: newRecord })
      checkInRecord = { _id, ...newRecord }

      // totalCompletions+1（仅新记录）
      await habitsCol.doc(habitId).update({
        data: { totalCompletions: _.inc(1) }
      })
    }

    // 重算连续天数
    const recentDates = getRecentDates(dateStr, 7)
    const { data: recentCheckins } = await checkInsCol
      .where({ _openid: openid, habitId, date: _.in(recentDates) })
      .limit(7)
      .get()

    const checkedSet = new Set(recentCheckins.map(r => r.date))
    const streakCurrent = calcStreak(recentDates, checkedSet)

    const updateData = { streakCurrent, updatedAt: db.serverDate() }
    if (streakCurrent > (habit.streakLongest || 0)) {
      updateData.streakLongest = streakCurrent
    }
    await habitsCol.doc(habitId).update({ data: updateData })

    results.push(checkInRecord)
  }

  return ok({ ritualId, checkIns: results, date: dateStr })
}

// ── main ─────────────────────────────────────────────────

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action } = event
  try {
    switch (action) {
      case 'list':    return await list(OPENID)
      case 'get':     return await get(OPENID, event)
      case 'create':  return await create(OPENID, event)
      case 'update':  return await update(OPENID, event)
      case 'delete':  return await remove(OPENID, event)
      case 'execute': return await execute(OPENID, event)
      default:        return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[' + action + ']', err)
    return fail(err.message || '服务器错误')
  }
}
