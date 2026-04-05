const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const ritualsCol = db.collection('rituals')
const habitsCol = db.collection('habits')
const checkInsCol = db.collection('check_ins')
const { isHabitActiveOnDate, calcStreak } = require('./streak')

// ── helpers ──────────────────────────────────────────────

function fail(message, data) {
  const res = { code: -1, message }
  if (data !== undefined) res.data = data
  return res
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

/** Strict YYYY-MM-DD validator — rejects malformed and non-roundtrip dates */
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

const STREAK_LOOKBACK = 365
const FREEZE_HABIT_ID = '__freeze__'

// isHabitActiveOnDate, calcStreak — imported from ./streak
// (canonical source: cloudfunctions/_shared/streak.js)

const SYSTEM_FIELDS = ['_id', '_openid', 'createdAt', 'updatedAt']
function sanitize(obj) {
  const cleaned = {}
  Object.keys(obj).forEach(key => {
    if (!SYSTEM_FIELDS.includes(key)) cleaned[key] = obj[key]
  })
  return cleaned
}

// ── 内容安全检查 ────────────────────────────────────────

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
    return true
  }
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
  let ritual
  try {
    const res = await ritualsCol.doc(event.id).get()
    ritual = res.data
  } catch {
    return fail('仪式不存在')
  }
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

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

async function create(openid, event) {
  const ritual = event.ritual
  if (!ritual) return fail('缺少数据')
  if (!ritual.name) return fail('仪式名称必填')

  const { total: ritualCount } = await ritualsCol.where({ _openid: openid }).count()
  if (ritualCount >= MAX_RITUALS_PER_USER) return fail('仪式数量已达上限')

  // 字段长度校验
  if (ritual.name.length > MAX_NAME_LENGTH) {
    return fail(`仪式名称不能超过 ${MAX_NAME_LENGTH} 个字符`)
  }
  if (ritual.description && ritual.description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`仪式描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`)
  }

  // 内容安全检查
  if (!(await checkText(ritual.name, openid, 2))) {
    return fail('仪式名称包含违规内容，请修改后重试')
  }
  if (ritual.description && !(await checkText(ritual.description, openid, 2))) {
    return fail('仪式描述包含违规内容，请修改后重试')
  }

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
  let existing
  try {
    const res = await ritualsCol.doc(event.id).get()
    existing = res.data
  } catch (e) {
    return fail('仪式不存在')
  }
  if (existing._openid !== openid) return fail('无权操作')

  // 字段长度校验
  const ritual = event.ritual || {}
  if (ritual.name && ritual.name.length > MAX_NAME_LENGTH) {
    return fail(`仪式名称不能超过 ${MAX_NAME_LENGTH} 个字符`)
  }
  if (ritual.description && ritual.description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`仪式描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`)
  }

  // 内容安全检查
  if (ritual.name && !(await checkText(ritual.name, openid, 2))) {
    return fail('仪式名称包含违规内容，请修改后重试')
  }
  if (ritual.description && !(await checkText(ritual.description, openid, 2))) {
    return fail('仪式描述包含违规内容，请修改后重试')
  }

  const fields = sanitize(event.ritual || {})
  fields.updatedAt = db.serverDate()

  await ritualsCol.doc(event.id).update({ data: fields })
  return ok({ _id: event.id, ...fields })
}

const MAX_RITUALS_PER_USER = 50

async function remove(openid, event) {
  if (!event.id) return fail('缺少仪式 ID')
  let existing
  try {
    const res = await ritualsCol.doc(event.id).get()
    existing = res.data
  } catch {
    return fail('仪式不存在')
  }
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

  // Strict date validation at the entry boundary
  if (date !== undefined && !isValidDateStr(date)) return fail('日期格式不合法')

  const dateStr = date ? toDateStr(date) : toDateStr(new Date())
  const today = toDateStr(new Date())
  const results = []
  const errors = [] // per-habit partial-failure surface

  // Batch query: fetch all valid habits in one call instead of per-habit doc().get()
  const { data: habitDocs } = await habitsCol
    .where({ _id: _.in(validIds), _openid: openid })
    .limit(100)
    .get()
  const habitMap = {}
  habitDocs.forEach(h => { habitMap[h._id] = h })

  for (const habitId of validIds) {
    const habit = habitMap[habitId]
    if (!habit) {
      errors.push({ habitId, error: 'not_found' })
      continue // 习惯不存在或不属于当前用户，跳过
    }
    if (habit.isArchived) {
      // Archived habits must not be mutated through ritual execution
      errors.push({ habitId, error: 'archived' })
      continue
    }

    try {
      // 查是否已有打卡记录
      const { data: existing } = await checkInsCol
        .where({ _openid: openid, habitId, date: dateStr })
        .limit(1)
        .get()

      let checkInRecord
      let wasNewRecord = false
      if (existing.length > 0) {
        // 已存在 → 更新，不 inc totalCompletions
        await checkInsCol.doc(existing[0]._id).update({
          data: { value: 1, updatedAt: db.serverDate() }
        })
        checkInRecord = { ...existing[0], value: 1 }
      } else {
        // 不存在 → 创建；unique index (_openid, habitId, date) protects us.
        // On race: fall back to update path so totalCompletions is NOT inc'd twice.
        const newRecord = {
          _openid: openid,
          habitId,
          date: dateStr,
          value: 1,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
        try {
          const { _id } = await checkInsCol.add({ data: newRecord })
          checkInRecord = { _id, ...newRecord }
          wasNewRecord = true
        } catch (dupErr) {
          // 唯一索引冲突 → 并发请求已插入，回退到更新路径（不 inc）
          const { data: raceExisting } = await checkInsCol
            .where({ _openid: openid, habitId, date: dateStr })
            .limit(1)
            .get()
          if (raceExisting.length > 0) {
            await checkInsCol.doc(raceExisting[0]._id).update({
              data: { value: 1, updatedAt: db.serverDate() }
            })
            checkInRecord = { ...raceExisting[0], value: 1 }
          } else {
            throw dupErr
          }
        }
        if (wasNewRecord) {
          // totalCompletions+1（仅真正的新记录才递增，避免重复计数）
          await habitsCol.doc(habitId).update({
            data: { totalCompletions: _.inc(1) }
          })
        }
      }

      // 重算连续天数（365 天回溯 + 冻结日，与 habit/checkIn 一致）
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
      const streakCurrent = calcStreak(recentDates, checkedSet, frozenSet, habit, today)

      const updateData = { streakCurrent, updatedAt: db.serverDate() }
      if (streakCurrent > (habit.streakLongest || 0)) {
        updateData.streakLongest = streakCurrent
      }
      await habitsCol.doc(habitId).update({ data: updateData })

      results.push(checkInRecord)
    } catch (err) {
      // Per-habit failure: record and continue so other habits in the ritual
      // still get processed. Caller sees exactly which habits failed.
      console.warn('[ritual.execute] habit failed:', habitId, err && err.message)
      errors.push({ habitId, error: err && err.message ? err.message : 'unknown' })
    }
  }

  // All-failed guard: if no habit succeeded but we have errors, do not
  // return a misleading success. Preserve partial-success (some results +
  // some errors) and pure-success (no errors) as regular ok() responses.
  if (results.length === 0 && errors.length > 0) {
    return fail('仪式执行失败', { ritualId, checkIns: results, errors, date: dateStr })
  }
  return ok({ ritualId, checkIns: results, errors, date: dateStr })
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
    console.error('[ritual/' + action + ']', err)
    return fail('服务器错误，请稍后重试')
  }
}
