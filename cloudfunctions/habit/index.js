const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const habitsCol = db.collection('habits')
const checkInsCol = db.collection('check_ins')
const boardCol = db.collection('board_notes')

// ── helpers ──────────────────────────────────────────────

function fail(message) {
  return { code: -1, message }
}

function ok(data) {
  return { code: 0, data }
}

/** 生成 YYYY-MM-DD 格式日期字符串（时区安全） */
function toDateStr(d) {
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
  // Date 对象 → 使用东八区偏移
  const dt = typeof d === 'string' ? new Date(d) : d
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 生成 ISO-8601 字符串（北京时间 UTC+8） */
function toIsoStr(d = new Date()) {
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

/** 将 YYYY-MM-DD 解析为 UTC 午夜 Date（用于日期计算） */
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** 获取过去 N 天的日期字符串数组（含基准日） */
function getRecentDates(baseDate, n) {
  const dates = []
  const base = parseDate(typeof baseDate === 'string'
    ? toDateStr(baseDate) : toDateStr(baseDate))
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setUTCDate(d.getUTCDate() - i)
    dates.push(toDateStr(d))
  }
  return dates
}

/** 根据最近打卡记录计算当前连续天数（冻结日视为已完成） */
function calcStreak(recentDates, checkedDateSet, frozenDateSet) {
  let streak = 0
  for (const date of recentDates) {
    if (checkedDateSet.has(date) || (frozenDateSet && frozenDateSet.has(date))) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/** 过滤系统字段，防止客户端注入 */
const SYSTEM_FIELDS = ['_id', '_openid', 'createdAt', 'updatedAt',
  'streakCurrent', 'streakLongest', 'totalCompletions', 'isArchived', 'order', 'id']
function sanitize(obj) {
  const cleaned = {}
  Object.keys(obj).forEach(key => {
    if (!SYSTEM_FIELDS.includes(key)) cleaned[key] = obj[key]
  })
  return cleaned
}

// ── actions ──────────────────────────────────────────────

async function list(openid) {
  const { data } = await habitsCol
    .where({ _openid: openid, isArchived: _.neq(true) })
    .orderBy('order', 'asc')
    .limit(100)
    .get()
  return ok(data)
}

async function get(openid, data) {
  if (!data || !data.id) return fail('缺少习惯 ID')
  const { data: records } = await habitsCol.doc(data.id).get()
  const habit = records
  if (habit._openid !== openid) return fail('无权访问')
  return ok(habit)
}

async function create(openid, data) {
  if (!data) return fail('缺少数据')
  const now = db.serverDate()

  // 查当前用户未归档习惯数量作为 order
  const { total } = await habitsCol
    .where({ _openid: openid, isArchived: _.neq(true) })
    .count()

  const record = {
    ...sanitize(data),
    _openid: openid,
    createdAt: now,
    updatedAt: now,
    streakCurrent: 0,
    streakLongest: 0,
    totalCompletions: 0,
    isArchived: false,
    order: total
  }
  const { _id } = await habitsCol.add({ data: record })
  return ok({ _id, ...record })
}

async function update(openid, data) {
  if (!data || !data.id) return fail('缺少习惯 ID')
  const { id } = data
  const fields = sanitize(data)

  // 校验归属
  const { data: habit } = await habitsCol.doc(id).get()
  if (habit._openid !== openid) return fail('无权操作')

  fields.updatedAt = db.serverDate()

  await habitsCol.doc(id).update({ data: fields })
  return ok({ _id: id, ...fields })
}

async function remove(openid, data) {
  if (!data || !data.id) return fail('缺少习惯 ID')
  const { data: habit } = await habitsCol.doc(data.id).get()
  if (habit._openid !== openid) return fail('无权操作')

  await habitsCol.doc(data.id).update({
    data: { isArchived: true, updatedAt: db.serverDate() }
  })
  return ok({ _id: data.id })
}

async function listArchived(openid) {
  const { data } = await habitsCol
    .where({ _openid: openid, isArchived: true })
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get()
  return ok(data)
}

async function restore(openid, data) {
  if (!data || !data.id) return fail('缺少习惯 ID')
  const { data: habit } = await habitsCol.doc(data.id).get()
  if (habit._openid !== openid) return fail('无权操作')
  if (!habit.isArchived) return fail('该习惯未归档')

  const { total } = await habitsCol
    .where({ _openid: openid, isArchived: _.neq(true) })
    .count()

  await habitsCol.doc(data.id).update({
    data: { isArchived: false, order: total, updatedAt: db.serverDate() }
  })
  return ok({ _id: data.id })
}

const FREEZE_HABIT_ID = '__freeze__'
const FREEZE_MONTHLY_LIMIT = 2
const STREAK_LOOKBACK = 365

// NOTE: For best protection, create a unique compound index on
// { _openid, habitId, date } in the cloud console to prevent duplicates at DB level.
async function freeze(openid, data) {
  if (!data || !data.date) return fail('缺少日期')
  const dateStr = toDateStr(data.date)

  // Only allow freezing today (no retroactive)
  const today = toDateStr(new Date())
  if (dateStr !== today) return fail('只能冻结当天')

  // Check if already frozen today
  const { data: existing } = await checkInsCol
    .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: dateStr })
    .limit(1)
    .get()
  if (existing.length > 0) return fail('今日已冻结')

  // Check monthly quota
  const month = dateStr.slice(0, 7)
  const { total: usedThisMonth } = await checkInsCol
    .where({ _openid: openid, habitId: FREEZE_HABIT_ID, month })
    .count()
  if (usedThisMonth >= FREEZE_MONTHLY_LIMIT) return fail('本月冻结次数已用完')

  // Insert freeze record
  const { _id } = await checkInsCol.add({
    data: {
      _openid: openid,
      habitId: FREEZE_HABIT_ID,
      date: dateStr,
      month,
      type: 'freeze',
      value: 1,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  // Post-insert duplicate check (compensating action for race condition)
  const { data: duplicates } = await checkInsCol
    .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: dateStr })
    .orderBy('createdAt', 'asc')
    .limit(5)
    .get()

  if (duplicates.length > 1) {
    // Another request beat us — keep earliest record, roll back ours
    if (_id !== duplicates[0]._id) {
      await checkInsCol.doc(_id).remove()
      return fail('今日已冻结')
    }
  }

  // Re-verify monthly quota after insert
  const { total: finalCount } = await checkInsCol
    .where({ _openid: openid, habitId: FREEZE_HABIT_ID, month })
    .count()

  if (finalCount > FREEZE_MONTHLY_LIMIT) {
    await checkInsCol.doc(_id).remove()
    return fail('本月冻结次数已用完')
  }

  return ok({ remaining: FREEZE_MONTHLY_LIMIT - finalCount })
}

async function getFreezeStatus(openid) {
  const today = toDateStr(new Date())
  const month = today.slice(0, 7)

  const [countRes, todayRes] = await Promise.all([
    checkInsCol
      .where({ _openid: openid, habitId: FREEZE_HABIT_ID, month })
      .count(),
    checkInsCol
      .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: today })
      .limit(1)
      .get(),
  ])

  const usedThisMonth = countRes.total
  return ok({
    usedThisMonth,
    remaining: Math.max(0, FREEZE_MONTHLY_LIMIT - usedThisMonth),
    todayFrozen: todayRes.data.length > 0,
  })
}

async function reorder(openid, data) {
  if (!data || !Array.isArray(data.orderedIds)) return fail('缺少 orderedIds')
  if (data.orderedIds.length > 200) return fail('排序数组过大')
  if (!data.orderedIds.every(id => typeof id === 'string')) return fail('orderedIds 格式错误')
  const tasks = data.orderedIds.map((id, index) =>
    habitsCol
      .where({ _id: id, _openid: openid })
      .update({ data: { order: index, updatedAt: db.serverDate() } })
  )
  await Promise.all(tasks)
  return ok(true)
}

async function checkIn(openid, data) {
  if (!data || !data.habitId || !data.date) {
    return fail('缺少 habitId 或 date')
  }
  const { habitId, date, value } = data
  const dateStr = toDateStr(date)

  // 校验习惯归属
  const { data: habit } = await habitsCol.doc(habitId).get()
  if (habit._openid !== openid) return fail('无权操作')

  // 查是否已有打卡记录
  const { data: existing } = await checkInsCol
    .where({ _openid: openid, habitId, date: dateStr })
    .limit(1)
    .get()

  let checkInRecord
  if (existing.length > 0) {
    // 已存在 → 更新
    await checkInsCol.doc(existing[0]._id).update({
      data: { value: value !== undefined ? value : true, updatedAt: db.serverDate() }
    })
    checkInRecord = { ...existing[0], value: value !== undefined ? value : existing[0].value }
  } else {
    // 不存在 → 创建 & totalCompletions+1
    const newRecord = {
      _openid: openid,
      habitId,
      date: dateStr,
      value: value !== undefined ? value : true,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    const { _id } = await checkInsCol.add({ data: newRecord })
    checkInRecord = { _id, ...newRecord }

    await habitsCol.doc(habitId).update({
      data: { totalCompletions: _.inc(1) }
    })
  }

  // 计算连续天数：查最近打卡记录 + 冻结记录（范围查询）
  const recentDates = getRecentDates(dateStr, STREAK_LOOKBACK)
  const lookbackStart = recentDates[recentDates.length - 1]
  const [checkRes, freezeRes] = await Promise.all([
    checkInsCol
      .where({ _openid: openid, habitId, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
      .limit(STREAK_LOOKBACK)
      .get(),
    checkInsCol
      .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
      .limit(STREAK_LOOKBACK)
      .get(),
  ])

  const checkedSet = new Set(checkRes.data.map(r => r.date))
  const frozenSet = new Set(freezeRes.data.map(r => r.date))
  const streakCurrent = calcStreak(recentDates, checkedSet, frozenSet)

  const updateData = { streakCurrent, updatedAt: db.serverDate() }
  if (streakCurrent > (habit.streakLongest || 0)) {
    updateData.streakLongest = streakCurrent
  }
  await habitsCol.doc(habitId).update({ data: updateData })

  return ok(checkInRecord)
}

async function uncheckIn(openid, data) {
  if (!data || !data.habitId || !data.date) {
    return fail('缺少 habitId 或 date')
  }
  const { habitId, date } = data
  const dateStr = toDateStr(date)

  // 校验习惯归属
  const { data: habit } = await habitsCol.doc(habitId).get()
  if (habit._openid !== openid) return fail('无权操作')

  // 查找并删除打卡记录
  const { data: existing } = await checkInsCol
    .where({ _openid: openid, habitId, date: dateStr })
    .limit(1)
    .get()

  if (existing.length === 0) return fail('未找到打卡记录')

  await checkInsCol.doc(existing[0]._id).remove()

  // totalCompletions-1（原子操作）
  await habitsCol.doc(habitId).update({
    data: {
      totalCompletions: _.inc(-1),
      updatedAt: db.serverDate()
    }
  })

  // 重算 streakCurrent（含冻结日，范围查询）
  const recentDates = getRecentDates(dateStr, STREAK_LOOKBACK)
  const lookbackStart = recentDates[recentDates.length - 1]
  const [uncheckRes, freezeRes2] = await Promise.all([
    checkInsCol
      .where({ _openid: openid, habitId, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
      .limit(STREAK_LOOKBACK)
      .get(),
    checkInsCol
      .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
      .limit(STREAK_LOOKBACK)
      .get(),
  ])

  const checkedSet = new Set(uncheckRes.data.map(r => r.date))
  const frozenSet = new Set(freezeRes2.data.map(r => r.date))
  const streakCurrent = calcStreak(recentDates, checkedSet, frozenSet)
  await habitsCol.doc(habitId).update({
    data: { streakCurrent, updatedAt: db.serverDate() }
  })

  return ok({ _id: existing[0]._id })
}

async function getCheckIns(openid, data) {
  if (!data) return fail('缺少查询参数')
  const where = { _openid: openid }

  if (data.habitId) {
    where.habitId = data.habitId
  } else {
    // Exclude freeze sentinel records by default
    where.habitId = _.neq(FREEZE_HABIT_ID)
  }

  if (data.date) {
    // 单日查询
    where.date = toDateStr(data.date)
  } else if (data.startDate && data.endDate) {
    // 范围查询
    where.date = _.gte(toDateStr(data.startDate)).and(_.lte(toDateStr(data.endDate)))
  } else {
    return fail('缺少 date 或 startDate+endDate')
  }

  const { data: records } = await checkInsCol
    .where(where)
    .orderBy('date', 'asc')
    .limit(1000)
    .get()
  return ok(records)
}

// ── board actions ────────────────────────────────────────

const BOARD_NOTE_TYPES = new Set(['text', 'checklist'])
const BOARD_COLORS = new Set(['yellow', 'pink', 'blue', 'green', 'purple', 'cream'])
const BOARD_MAX_CHECK_ITEMS = 50
const BOARD_MAX_TAGS = 3

function toSafeNumber(value, fallback) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeBoardContent(value) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 1000)
}

function normalizeBoardCheckItems(items) {
  if (!Array.isArray(items)) return []
  const normalized = items
    .map((item, index) => ({
      id: item && item.id ? String(item.id) : String(index + 1),
      text: item && item.text ? String(item.text).trim() : '',
      checked: !!(item && item.checked),
    }))
    .filter((item) => item.text.length > 0)

  if (normalized.length > BOARD_MAX_CHECK_ITEMS) {
    return normalized.slice(0, BOARD_MAX_CHECK_ITEMS)
  }
  return normalized
}

function normalizeBoardTags(tags) {
  if (!Array.isArray(tags)) return []
  const seen = new Set()
  const normalized = []
  for (const raw of tags) {
    const tag = typeof raw === 'string' ? raw.trim() : ''
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    normalized.push(tag.slice(0, 20))
    if (normalized.length >= BOARD_MAX_TAGS) break
  }
  return normalized
}

function normalizeLinkedHabitId(linkedHabitId) {
  if (typeof linkedHabitId !== 'string') return ''
  return linkedHabitId.trim()
}

function normalizeBoardGroupId(groupId) {
  if (typeof groupId !== 'string') return ''
  return groupId.trim().slice(0, 24)
}

function normalizeBoardImageUrl(imageUrl) {
  if (typeof imageUrl !== 'string') return ''
  return imageUrl.trim()
}

async function verifyLinkedHabit(openid, linkedHabitId) {
  const normalized = normalizeLinkedHabitId(linkedHabitId)
  if (!normalized) {
    return { ok: true, linkedHabitId: '' }
  }

  try {
    const { data: habit } = await habitsCol.doc(normalized).get()
    if (!habit || habit._openid !== openid || habit.isArchived) {
      return { ok: false, message: '关联习惯不存在或已归档' }
    }
    return { ok: true, linkedHabitId: normalized }
  } catch (err) {
    return { ok: false, message: '关联习惯不存在或无权限' }
  }
}

async function boardList(openid) {
  const { data } = await boardCol
    .where({ _openid: openid })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()
  return ok(data)
}

async function boardCreate(openid, data) {
  if (!data) return fail('缺少便签数据')
  const now = toIsoStr()
  const positionMode = data.positionMode === 'manual' ? 'manual' : 'auto'
  if (Array.isArray(data.checkItems) && data.checkItems.length > BOARD_MAX_CHECK_ITEMS) {
    return fail('清单最多 50 项')
  }
  const noteType = BOARD_NOTE_TYPES.has(data.noteType) ? data.noteType : 'text'
  const checkItems = normalizeBoardCheckItems(data.checkItems)
  const tags = normalizeBoardTags(data.tags)
  const groupId = normalizeBoardGroupId(data.groupId)
  const content = normalizeBoardContent(data.content)
  const fallbackContent = checkItems.map((item) => item.text).join('\n')
  const finalContent = content || fallbackContent
  const linkedHabitCheck = await verifyLinkedHabit(openid, data.linkedHabitId)
  if (!linkedHabitCheck.ok) return fail(linkedHabitCheck.message)
  if (noteType === 'checklist' && checkItems.length === 0) {
    return fail('清单至少需要 1 项')
  }
  if (!finalContent) return fail('便签内容不能为空')

  const noteData = {
    content: finalContent,
    color: BOARD_COLORS.has(data.color) ? data.color : 'yellow',
    size: Math.min(4, Math.max(1, toSafeNumber(data.size, 2))),
    fontSize: data.fontSize || 'md',
    textAlign: data.textAlign || 'left',
    textVertical: data.textVertical || 'top',
    fontFamily: data.fontFamily || 'hand',
    positionMode,
    noteShape: data.noteShape || 'rect',
    noteType,
    checkItems: noteType === 'checklist' ? checkItems : [],
    groupId,
    linkedHabitId: linkedHabitCheck.linkedHabitId,
    isPinned: !!data.isPinned,
    tags,
    imageUrl: normalizeBoardImageUrl(data.imageUrl),
    x: positionMode === 'manual' ? toSafeNumber(data.x, 0) : 0,
    y: positionMode === 'manual' ? toSafeNumber(data.y, 0) : 0,
    rotation: toSafeNumber(
      data.rotation,
      Math.round((Math.random() * 6 - 3) * 10) / 10,
    ),
    _openid: openid,
    createdAt: now,
    updatedAt: now,
  }
  const { _id } = await boardCol.add({ data: noteData })
  return ok({ _id, ...noteData })
}

async function boardUpdate(openid, data) {
  if (!data || !data.id) return fail('缺少便签 ID')
  const { data: note } = await boardCol.doc(data.id).get()
  if (note._openid !== openid) return fail('无权操作')

  const incoming = data.updates && typeof data.updates === 'object'
    ? data.updates
    : {}
  const has = (key) => Object.prototype.hasOwnProperty.call(incoming, key)
  const updates = {}

  if (has('content')) {
    updates.content = normalizeBoardContent(incoming.content)
  }
  if (has('color')) {
    updates.color = BOARD_COLORS.has(incoming.color)
      ? incoming.color
      : (note.color || 'yellow')
  }
  if (has('size')) {
    updates.size = Math.min(4, Math.max(1, toSafeNumber(incoming.size, note.size || 2)))
  }
  if (has('fontSize')) {
    updates.fontSize = incoming.fontSize || (note.fontSize || 'md')
  }
  if (has('textAlign')) {
    updates.textAlign = incoming.textAlign || (note.textAlign || 'left')
  }
  if (has('textVertical')) {
    updates.textVertical = incoming.textVertical || (note.textVertical || 'top')
  }
  if (has('fontFamily')) {
    updates.fontFamily = incoming.fontFamily || (note.fontFamily || 'hand')
  }
  if (has('positionMode')) {
    updates.positionMode = incoming.positionMode === 'manual' ? 'manual' : 'auto'
  }
  if (has('noteShape')) {
    updates.noteShape = incoming.noteShape || (note.noteShape || 'rect')
  }
  if (has('noteType')) {
    updates.noteType = BOARD_NOTE_TYPES.has(incoming.noteType)
      ? incoming.noteType
      : (note.noteType || 'text')
  }
  if (has('checkItems')) {
    if (Array.isArray(incoming.checkItems) && incoming.checkItems.length > BOARD_MAX_CHECK_ITEMS) {
      return fail('清单最多 50 项')
    }
    updates.checkItems = normalizeBoardCheckItems(incoming.checkItems)
  }
  if (has('linkedHabitId')) {
    const linkedHabitCheck = await verifyLinkedHabit(openid, incoming.linkedHabitId)
    if (!linkedHabitCheck.ok) return fail(linkedHabitCheck.message)
    updates.linkedHabitId = linkedHabitCheck.linkedHabitId
  }
  if (has('groupId')) {
    updates.groupId = normalizeBoardGroupId(incoming.groupId)
  }
  if (has('isPinned')) {
    updates.isPinned = !!incoming.isPinned
  }
  if (has('tags')) {
    updates.tags = normalizeBoardTags(incoming.tags)
  }
  if (has('imageUrl')) {
    updates.imageUrl = normalizeBoardImageUrl(incoming.imageUrl)
  }
  if (has('x')) updates.x = toSafeNumber(incoming.x, note.x || 0)
  if (has('y')) updates.y = toSafeNumber(incoming.y, note.y || 0)
  if (has('rotation')) {
    updates.rotation = toSafeNumber(incoming.rotation, note.rotation || 0)
  }

  const nextType = updates.noteType || note.noteType || 'text'
  const nextCheckItems = Array.isArray(updates.checkItems)
    ? updates.checkItems
    : normalizeBoardCheckItems(note.checkItems)
  const nextContent = has('content')
    ? updates.content
    : normalizeBoardContent(note.content)
  const fallbackContent = nextCheckItems.map((item) => item.text).join('\n')
  const finalContent = nextContent || fallbackContent

  if (nextType === 'checklist' && nextCheckItems.length === 0) {
    return fail('清单至少需要 1 项')
  }
  if (!finalContent) {
    return fail('便签内容不能为空')
  }

  if (nextType === 'checklist') {
    updates.checkItems = nextCheckItems
  } else if (has('noteType') || has('checkItems')) {
    updates.checkItems = []
  }
  if (!nextContent && fallbackContent) {
    updates.content = fallbackContent
  }

  updates.updatedAt = toIsoStr()
  await boardCol.doc(data.id).update({ data: updates })
  const { data: next } = await boardCol.doc(data.id).get()
  return ok(next)
}

async function boardDelete(openid, data) {
  if (!data || !data.id) return fail('缺少便签 ID')
  const { data: note } = await boardCol.doc(data.id).get()
  if (note._openid !== openid) return fail('无权操作')
  await boardCol.doc(data.id).remove()
  return ok({ _id: data.id })
}

async function boardBatchUpdate(openid, data) {
  if (!data || !Array.isArray(data.updates)) return fail('缺少 updates 数组')
  if (data.updates.length > 50) return fail('批量更新过多')
  const now = toIsoStr()
  const tasks = data.updates.map(u =>
    boardCol
      .where({ _id: u.id, _openid: openid })
      .update({ data: { ...u.fields, updatedAt: now } })
  )
  await Promise.all(tasks)
  return ok(true)
}

// ── main ─────────────────────────────────────────────────

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action, data } = event
  try {
    switch (action) {
      case 'list': return await list(OPENID)
      case 'get': return await get(OPENID, data)
      case 'create': return await create(OPENID, data)
      case 'update': return await update(OPENID, data)
      case 'delete': return await remove(OPENID, data)
      case 'listArchived': return await listArchived(OPENID)
      case 'restore': return await restore(OPENID, data)
      case 'reorder': return await reorder(OPENID, data)
      case 'checkIn': return await checkIn(OPENID, data)
      case 'uncheckIn': return await uncheckIn(OPENID, data)
      case 'getCheckIns': return await getCheckIns(OPENID, data)
      case 'freeze': return await freeze(OPENID, data)
      case 'getFreezeStatus': return await getFreezeStatus(OPENID)
      // Board actions
      case 'boardList': return await boardList(OPENID)
      case 'boardCreate': return await boardCreate(OPENID, data)
      case 'boardUpdate': return await boardUpdate(OPENID, data)
      case 'boardDelete': return await boardDelete(OPENID, data)
      case 'boardBatchUpdate': return await boardBatchUpdate(OPENID, data)
      default: return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[' + action + ']', err)
    return fail(err.message || '服务器错误')
  }
}
