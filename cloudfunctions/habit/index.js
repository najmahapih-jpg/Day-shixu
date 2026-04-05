const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const habitsCol = db.collection('habits')
const checkInsCol = db.collection('check_ins')
const boardCol = db.collection('board_notes')
const streak = require('./streak')
const { isHabitActiveOnDate, calcStreak, calcLongestStreak } = streak

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

/**
 * Strict YYYY-MM-DD validator.
 * Rejects malformed inputs, impossible months/days, and non-round-trip dates
 * (e.g. 2026-02-30 → falls back to March via Date). Use at client-input
 * boundaries BEFORE toDateStr to keep bogus data out of the DB.
 */
const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/
function isValidDateStr(v) {
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

/** Max span for getCheckIns range queries (inclusive). Keep explicit. */
const MAX_CHECKIN_RANGE_DAYS = 400

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

/** 分页获取记录（绕过 wx-server-sdk 100 条上限） */
async function paginatedGet(query, maxRecords = 400) {
  const all = []
  const PAGE = 100
  for (let skip = 0; skip < maxRecords; skip += PAGE) {
    const { data } = await query.skip(skip).limit(PAGE).get()
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}

// isHabitActiveOnDate, calcStreak, calcLongestStreak — imported from ./streak
// (canonical source: cloudfunctions/_shared/streak.js, synced via scripts/sync-shared.js)


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

// ── 内容安全检查 ────────────────────────────────────────

/**
 * 文本内容安全检查 (微信审核必需)
 * @param {string} content - 待检查文本
 * @param {string} openid - 用户 openid
 * @param {number} scene - 场景值: 1=资料, 2=评论, 3=论坛, 4=社交日志
 * @returns {Promise<boolean>} true=通过, false=违规
 */
async function checkText(content, openid, scene) {
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
    return true // fail-open，避免安全API故障时阻塞用户
  }
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
  let habit
  try {
    const res = await habitsCol.doc(data.id).get()
    habit = res.data
  } catch (e) {
    return fail('习惯不存在')
  }
  if (habit._openid !== openid) return fail('无权访问')
  return ok(habit)
}

const MAX_HABITS_PER_USER = 200
const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

async function create(openid, data) {
  if (!data) return fail('缺少数据')
  if (!data.name || !data.name.trim()) return fail('习惯名称必填')

  // 字段长度校验
  if (data.name.length > MAX_NAME_LENGTH) {
    return fail(`习惯名称不能超过 ${MAX_NAME_LENGTH} 个字符`)
  }
  if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`习惯描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`)
  }

  // 内容安全检查
  if (data.name && !(await checkText(data.name, openid, 2))) {
    return fail('习惯名称包含违规内容，请修改后重试')
  }
  if (data.description && !(await checkText(data.description, openid, 2))) {
    return fail('习惯描述包含违规内容，请修改后重试')
  }

  const now = db.serverDate()

  // 查当前用户习惯总数（含归档），用作 order 和上限检查
  const { total } = await habitsCol
    .where({ _openid: openid, isArchived: _.neq(true) })
    .count()

  if (total >= MAX_HABITS_PER_USER) {
    return fail(`习惯数量已达上限（${MAX_HABITS_PER_USER}）`)
  }

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

  // 字段长度校验
  if (data.name && data.name.length > MAX_NAME_LENGTH) {
    return fail(`习惯名称不能超过 ${MAX_NAME_LENGTH} 个字符`)
  }
  if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`习惯描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`)
  }

  // 内容安全检查
  if (data.name && !(await checkText(data.name, openid, 2))) {
    return fail('习惯名称包含违规内容，请修改后重试')
  }
  if (data.description && !(await checkText(data.description, openid, 2))) {
    return fail('习惯描述包含违规内容，请修改后重试')
  }

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

  // Reset streakCurrent on restore: while archived, the habit accrued gap
  // days that would otherwise make the stale streak misrepresent current
  // adherence. Preserve streakLongest so historical achievements survive.
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

// NOTE: For best protection, create a unique compound index on
// { _openid, habitId, date } in the cloud console to prevent duplicates at DB level.
async function freeze(openid, data) {
  if (!data || !data.date) return fail('缺少日期')
  if (!isValidDateStr(data.date)) return fail('日期格式不合法')
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

  // date 格式校验（严格 YYYY-MM-DD）
  if (!isValidDateStr(date)) return fail('日期格式不合法')

  // value 校验：仅允许 boolean 或 0-9999 的数字
  if (value !== undefined) {
    if (typeof value === 'boolean') {
      // ok
    } else if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0 || value > 9999) {
        return fail('打卡值必须在 0-9999 之间')
      }
    } else {
      return fail('打卡值类型不合法')
    }
  }

  const dateStr = toDateStr(date)

  // 校验习惯归属
  const { data: habit } = await habitsCol.doc(habitId).get()
  if (habit._openid !== openid) return fail('无权操作')
  if (habit.isArchived) return fail('习惯已归档')

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
    // 唯一复合索引 checkin_habit_date_unique (_openid, habitId, date)
    // 保证并发插入时仅一条成功，失败方回退到更新路径
    const newRecord = {
      _openid: openid,
      habitId,
      date: dateStr,
      value: value !== undefined ? value : true,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    try {
      const { _id } = await checkInsCol.add({ data: newRecord })
      checkInRecord = { _id, ...newRecord }

      await habitsCol.doc(habitId).update({
        data: { totalCompletions: _.inc(1) }
      })
    } catch (dupErr) {
      // 唯一索引冲突 → 并发请求已插入，回退到更新路径
      const { data: raceExisting } = await checkInsCol
        .where({ _openid: openid, habitId, date: dateStr })
        .limit(1)
        .get()
      if (raceExisting.length > 0) {
        await checkInsCol.doc(raceExisting[0]._id).update({
          data: { value: value !== undefined ? value : true, updatedAt: db.serverDate() }
        })
        checkInRecord = { ...raceExisting[0], value: value !== undefined ? value : raceExisting[0].value }
      } else {
        // 索引冲突但查不到记录（不应发生），抛出原始错误
        throw dupErr
      }
    }
  }

  // 计算连续天数：查最近打卡记录 + 冻结记录（范围查询）
  const recentDates = getRecentDates(dateStr, STREAK_LOOKBACK)
  const lookbackStart = recentDates[recentDates.length - 1]
  const [checkData, freezeData] = await Promise.all([
    paginatedGet(
      checkInsCol
        .where({ _openid: openid, habitId, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
        .orderBy('date', 'desc')
    ),
    paginatedGet(
      checkInsCol
        .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
        .orderBy('date', 'desc')
    ),
  ])

  const checkedSet = new Set(checkData.map(r => r.date))
  const frozenSet = new Set(freezeData.map(r => r.date))
  const today = toDateStr(new Date())
  const streakCurrent = calcStreak(recentDates, checkedSet, frozenSet, habit, today)

  const updateData = { streakCurrent, updatedAt: db.serverDate() }
  if (streakCurrent > (habit.streakLongest || 0)) {
    updateData.streakLongest = streakCurrent
  }
  await habitsCol.doc(habitId).update({ data: updateData })

  return ok({
    ...checkInRecord,
    streakCurrent,
    streakLongest: updateData.streakLongest ?? (habit.streakLongest || 0)
  })
}

async function uncheckIn(openid, data) {
  if (!data || !data.habitId || !data.date) {
    return fail('缺少 habitId 或 date')
  }
  const { habitId, date } = data
  if (!isValidDateStr(date)) return fail('日期格式不合法')
  const dateStr = toDateStr(date)

  // 校验习惯归属
  const { data: habit } = await habitsCol.doc(habitId).get()
  if (habit._openid !== openid) return fail('无权操作')
  if (habit.isArchived) return fail('习惯已归档')

  // 查找并删除打卡记录
  const { data: existing } = await checkInsCol
    .where({ _openid: openid, habitId, date: dateStr })
    .limit(1)
    .get()

  if (existing.length === 0) return fail('未找到打卡记录')

  await checkInsCol.doc(existing[0]._id).remove()

  // totalCompletions-1（仅当 > 0 时递减，防止负数）
  if ((habit.totalCompletions || 0) > 0) {
    await habitsCol.doc(habitId).update({
      data: {
        totalCompletions: _.inc(-1),
        updatedAt: db.serverDate()
      }
    })
  }

  // 重算 streakCurrent（含冻结日，范围查询）
  const recentDates = getRecentDates(dateStr, STREAK_LOOKBACK)
  const lookbackStart = recentDates[recentDates.length - 1]
  const [uncheckData, freezeData2] = await Promise.all([
    paginatedGet(
      checkInsCol
        .where({ _openid: openid, habitId, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
        .orderBy('date', 'desc')
    ),
    paginatedGet(
      checkInsCol
        .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
        .orderBy('date', 'desc')
    ),
  ])

  const checkedSet = new Set(uncheckData.map(r => r.date))
  const frozenSet = new Set(freezeData2.map(r => r.date))
  const today = toDateStr(new Date())
  const streakCurrent = calcStreak(recentDates, checkedSet, frozenSet, habit, today)
  const streakLongest = calcLongestStreak(recentDates, checkedSet, frozenSet, habit)
  await habitsCol.doc(habitId).update({
    data: { streakCurrent, streakLongest, updatedAt: db.serverDate() }
  })

  return ok({ _id: existing[0]._id, streakCurrent })
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
    if (!isValidDateStr(data.date)) return fail('日期格式不合法')
    where.date = toDateStr(data.date)
  } else if (data.startDate && data.endDate) {
    // 范围查询
    if (!isValidDateStr(data.startDate) || !isValidDateStr(data.endDate)) {
      return fail('日期格式不合法')
    }
    const s = toDateStr(data.startDate)
    const e = toDateStr(data.endDate)
    if (s > e) return fail('startDate 不能晚于 endDate')
    // Range clamp: reject oversized spans to protect the query path
    const spanMs = parseDate(e).getTime() - parseDate(s).getTime()
    if (spanMs > MAX_CHECKIN_RANGE_DAYS * 24 * 3600 * 1000) {
      return fail('查询范围不能超过 ' + MAX_CHECKIN_RANGE_DAYS + ' 天')
    }
    where.date = _.gte(s).and(_.lte(e))
  } else {
    return fail('缺少 date 或 startDate+endDate')
  }

  // 分页获取（wx-server-sdk 单次上限 100 条）
  const PAGE = 100
  let records = []
  let skip = 0
  while (true) {
    const { data } = await checkInsCol
      .where(where)
      .orderBy('date', 'asc')
      .skip(skip)
      .limit(PAGE)
      .get()
    records = records.concat(data)
    if (data.length < PAGE) break
    skip += PAGE
    if (records.length >= 5000) break // safety cap
  }
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

const BOARD_IMAGE_ALLOWED_PREFIXES = ['cloud://', 'https://', 'wxfile://']
function normalizeBoardImageUrl(imageUrl) {
  if (typeof imageUrl !== 'string') return ''
  const val = imageUrl.trim()
  if (!val) return ''
  if (val.length > 2048) return ''
  if (!BOARD_IMAGE_ALLOWED_PREFIXES.some(p => val.startsWith(p))) return ''
  return val
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

const MAX_BOARD_NOTES_PER_USER = 200

async function boardCreate(openid, data) {
  if (!data) return fail('缺少便签数据')

  const { total: noteCount } = await boardCol.where({ _openid: openid }).count()
  if (noteCount >= MAX_BOARD_NOTES_PER_USER) return fail('便签数量已达上限')

  // 内容安全检查
  if (data.content && !(await checkText(data.content, openid, 4))) {
    return fail('便签内容包含违规内容，请修改后重试')
  }

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

  // 清单项内容安全检查
  if (noteType === 'checklist' && checkItems.length > 0) {
    const combinedText = checkItems.map(i => i.text).join('\n')
    if (!(await checkText(combinedText, openid, 4))) {
      return fail('清单内容包含违规内容，请修改后重试')
    }
  }

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

  // 内容安全检查
  if (data.updates && data.updates.content && !(await checkText(data.updates.content, openid, 4))) {
    return fail('便签内容包含违规内容，请修改后重试')
  }

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
    if (updates.checkItems.length > 0) {
      const combinedText = updates.checkItems.map(i => i.text).join('\n')
      if (!(await checkText(combinedText, openid, 4))) {
        return fail('清单内容包含违规内容，请修改后重试')
      }
    }
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

// 批量更新仅允许布局/样式字段，禁止通过此入口修改内容
const BATCH_ALLOWED_FIELDS = new Set([
  'x', 'y', 'rotation', 'positionMode', 'isPinned',
  'size', 'color', 'fontSize', 'textAlign', 'textVertical', 'fontFamily', 'noteShape',
])

async function boardBatchUpdate(openid, data) {
  if (!data || !Array.isArray(data.updates)) return fail('缺少 updates 数组')
  if (data.updates.length > 50) return fail('批量更新过多')
  const now = toIsoStr()
  const tasks = data.updates.map(u => {
    // 过滤字段：只允许布局/样式属性，内容变更须走 boardUpdate
    const safeFields = {}
    if (u.fields && typeof u.fields === 'object') {
      for (const key of Object.keys(u.fields)) {
        if (BATCH_ALLOWED_FIELDS.has(key)) {
          safeFields[key] = u.fields[key]
        }
      }
    }
    safeFields.updatedAt = now
    return boardCol
      .where({ _id: u.id, _openid: openid })
      .update({ data: safeFields })
  })
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
    return fail('服务器错误，请稍后重试')
  }
}
