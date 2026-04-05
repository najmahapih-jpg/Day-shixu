const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const habitsCol = db.collection('habits')
const checkInsCol = db.collection('check_ins')
const { isHabitActiveOnDate, calcStreak, calcLongestStreak } = require('./streak')

// ── helpers ──────────────────────────────────────────────

function fail(message) {
  return { code: -1, message }
}

function ok(data) {
  return { code: 0, data }
}

const FREEZE_HABIT_ID = '__freeze__'

/** 生成 YYYY-MM-DD 格式日期字符串（UTC+8） */
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

/** 将 YYYY-MM-DD 解析为 UTC 午夜 Date */
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** 获取 YYYY-MM-DD 对应的星期几 (0=Sun, 1=Mon ... 6=Sat) */
function getWeekday(dateStr) {
  return parseDate(dateStr).getUTCDay()
}

// isHabitActiveOnDate — imported from ./streak (canonical source)

/** 生成 startDate 到 endDate（含）之间所有日期字符串 */
function getDateRange(startDate, endDate) {
  const dates = []
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const cur = new Date(start)
  while (cur <= end) {
    dates.push(toDateStr(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

/** 获取今天（UTC+8）和相关的周一日期 */
function getTodayStr() {
  return toDateStr(new Date())
}

/** 获取指定日期所在周的周一 */
function getMonday(dateStr) {
  const d = parseDate(dateStr)
  const wd = d.getUTCDay() // 0=Sun
  const diff = wd === 0 ? -6 : 1 - wd
  d.setUTCDate(d.getUTCDate() + diff)
  return toDateStr(d)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * 批量查询 check_ins（处理云数据库100条/次限制）
 *
 * Returns { records, truncated }. `truncated` is true iff the
 * `maxRecords` cap was hit before natural loop termination — callers
 * should surface this to the API response so the frontend can flag
 * incomplete aggregations instead of silently showing under-counts.
 */
async function batchGetCheckIns(where, maxRecords = 50000) {
  const MAX = 100
  let records = []
  let skip = 0
  let truncated = false
  while (true) {
    const { data } = await checkInsCol
      .where(where)
      .skip(skip)
      .limit(MAX)
      .get()
    records = records.concat(data)
    if (data.length < MAX) break
    if (records.length >= maxRecords) {
      truncated = true
      console.warn('[stats] batchGetCheckIns truncated at', maxRecords, 'records')
      break
    }
    skip += MAX
  }
  return { records, truncated }
}

/** 分页获取习惯（绕过 wx-server-sdk 100 条上限） */
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

/** 获取从 baseDate 向前 n 天的日期字符串数组（含 baseDate） */
function getRecentDates(baseDate, n) {
  const dates = []
  const base = parseDate(baseDate)
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setUTCDate(d.getUTCDate() - i)
    dates.push(toDateStr(d))
  }
  return dates
}

// calcStreak / calcLongestStreak — imported from ./streak (canonical source)

// ── actions ──────────────────────────────────────────────

const MAX_DATE_RANGE_DAYS = 400

/** Validate date string is parseable and returns a valid Date */
function isValidDate(dateStr) {
  const d = parseDate(toDateStr(dateStr))
  return !isNaN(d.getTime())
}

async function getHeatmap(openid, data) {
  if (!data || !data.startDate || !data.endDate) {
    return fail('缺少 startDate 或 endDate')
  }

  if (!isValidDate(data.startDate) || !isValidDate(data.endDate)) {
    return fail('日期格式不合法')
  }

  const startDate = toDateStr(data.startDate)
  const endDate = toDateStr(data.endDate)

  if (startDate > endDate) {
    return fail('startDate 不能晚于 endDate')
  }

  const rangeMs = parseDate(endDate).getTime() - parseDate(startDate).getTime()
  if (rangeMs > MAX_DATE_RANGE_DAYS * 24 * 3600 * 1000) {
    return fail('查询范围不能超过 400 天')
  }

  // 1. 查询该用户所有活跃（未归档）习惯（分页，防止 >100 个习惯被截断）
  const habits = await paginatedGet(
    habitsCol.where({ _openid: openid, isArchived: _.neq(true) })
  )

  // 2. 查询日期范围内的打卡记录（排除冻结哨兵）
  const checkInsResult = await batchGetCheckIns({
    _openid: openid,
    habitId: _.neq(FREEZE_HABIT_ID),
    date: _.gte(startDate).and(_.lte(endDate)),
  })
  const checkIns = checkInsResult.records

  // 3. 查询日期范围内的冻结记录
  const freezeResult = await batchGetCheckIns({
    _openid: openid,
    habitId: FREEZE_HABIT_ID,
    date: _.gte(startDate).and(_.lte(endDate)),
  })
  const frozenDates = new Set(freezeResult.records.map(r => r.date))
  const truncated = checkInsResult.truncated || freezeResult.truncated

  // 4. 按日期聚合打卡次数
  const checkInsByDate = {}
  checkIns.forEach(ci => {
    checkInsByDate[ci.date] = (checkInsByDate[ci.date] || 0) + 1
  })

  // 5. 生成每日数据
  const allDates = getDateRange(startDate, endDate)
  const days = allDates.map(date => {
    const count = checkInsByDate[date] || 0
    const total = habits.filter(h => isHabitActiveOnDate(h, date)).length
    const rate = total > 0 ? Math.round((count / total) * 100) / 100 : 0
    const frozen = frozenDates.has(date)
    return { date, count, total, rate, frozen }
  })

  return ok({ days, truncated })
}

async function getStreaks(openid) {
  const today = getTodayStr()

  // 1. 查询所有活跃习惯（分页，防止 >100 个习惯被静默截断）
  const habits = await paginatedGet(
    habitsCol.where({ _openid: openid, isArchived: _.neq(true) })
  )

  if (habits.length === 0) {
    return ok({
      currentStreak: 0,
      longestStreak: 0,
      totalCheckIns: 0,
      habits: [],
    })
  }

  // 2. 查询过去365天的所有打卡记录
  const LOOKBACK = 365
  const recentDates = getRecentDates(today, LOOKBACK)
  const lookbackDate = recentDates[recentDates.length - 1]
  const [allCheckInsResult, freezeResult] = await Promise.all([
    batchGetCheckIns({
      _openid: openid,
      habitId: _.neq(FREEZE_HABIT_ID),
      date: _.gte(lookbackDate).and(_.lte(today)),
    }),
    batchGetCheckIns({
      _openid: openid,
      habitId: FREEZE_HABIT_ID,
      date: _.gte(lookbackDate).and(_.lte(today)),
    }),
  ])

  const allCheckIns = allCheckInsResult.records
  const frozenSet = new Set(freezeResult.records.map(r => r.date))
  const truncated = allCheckInsResult.truncated || freezeResult.truncated

  // 按 habitId 分组打卡记录
  const checkInsByHabit = {}
  allCheckIns.forEach(ci => {
    if (!checkInsByHabit[ci.habitId]) checkInsByHabit[ci.habitId] = new Set()
    checkInsByHabit[ci.habitId].add(ci.date)
  })

  let globalCurrentStreak = 0
  let globalLongestStreak = 0
  const totalCheckIns = allCheckIns.length

  // 3. 对每个习惯计算连续天数（使用 canonical calcStreak / calcLongestStreak）
  const habitStreaks = habits.map(habit => {
    const checkedDates = checkInsByHabit[habit._id] || new Set()
    const currentStreak = calcStreak(recentDates, checkedDates, frozenSet, habit, today)
    const longestStreak = calcLongestStreak(recentDates, checkedDates, frozenSet, habit)

    if (currentStreak > globalCurrentStreak) globalCurrentStreak = currentStreak
    if (longestStreak > globalLongestStreak) globalLongestStreak = longestStreak

    return {
      id: habit._id,
      name: habit.name,
      currentStreak,
      longestStreak,
    }
  })

  return ok({
    currentStreak: globalCurrentStreak,
    longestStreak: globalLongestStreak,
    totalCheckIns,
    habits: habitStreaks,
    truncated,
  })
}

async function getWeeklyComparison(openid) {
  const today = getTodayStr()
  const thisMonday = getMonday(today)
  const lastMonday = toDateStr(
    new Date(parseDate(thisMonday).getTime() - 7 * 24 * 3600 * 1000)
  )
  // Use the same day count as thisWeek (Mon..today) for a fair comparison
  const elapsedDays = Math.round(
    (parseDate(today).getTime() - parseDate(thisMonday).getTime()) / (24 * 3600 * 1000)
  )
  const lastWeekEnd = toDateStr(
    new Date(parseDate(lastMonday).getTime() + elapsedDays * 24 * 3600 * 1000)
  )

  // 查询活跃习惯（分页）
  const habits = await paginatedGet(
    habitsCol.where({ _openid: openid, isArchived: _.neq(true) })
  )

  // 查询两周范围内的打卡记录
  const checkInsResult = await batchGetCheckIns({
    _openid: openid,
    habitId: _.neq(FREEZE_HABIT_ID),
    date: _.gte(lastMonday).and(_.lte(today)),
  })
  const checkIns = checkInsResult.records
  const truncated = checkInsResult.truncated

  // 按日期分组打卡数
  const checkInsByDate = {}
  checkIns.forEach(ci => {
    checkInsByDate[ci.date] = (checkInsByDate[ci.date] || 0) + 1
  })

  // 计算每日完成率
  function buildWeekData(mondayStr, endStr) {
    const dates = getDateRange(mondayStr, endStr)
    return dates.map((date, idx) => {
      const count = checkInsByDate[date] || 0
      const total = habits.filter(h => isHabitActiveOnDate(h, date)).length
      const rate = total > 0 ? Math.round((count / total) * 100) / 100 : 0
      return { day: DAY_LABELS[idx], rate }
    })
  }

  const thisWeek = buildWeekData(thisMonday, today)
  const lastWeek = buildWeekData(lastMonday, lastWeekEnd)

  // 计算平均完成率
  const avgThis = thisWeek.length > 0
    ? thisWeek.reduce((s, d) => s + d.rate, 0) / thisWeek.length
    : 0
  const avgLast = lastWeek.length > 0
    ? lastWeek.reduce((s, d) => s + d.rate, 0) / lastWeek.length
    : 0
  const improvement = Math.round((avgThis - avgLast) * 100) / 100

  return ok({ thisWeek, lastWeek, improvement, truncated })
}

// ── main ─────────────────────────────────────────────────

// Exposed for tests (internal helper — do not rely on stability)
exports._test = { batchGetCheckIns }

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action, data } = event
  try {
    switch (action) {
      case 'getHeatmap': return await getHeatmap(OPENID, data)
      case 'getStreaks': return await getStreaks(OPENID)
      case 'getWeeklyComparison': return await getWeeklyComparison(OPENID)
      default: return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[stats/' + action + ']', err)
    return fail('服务器错误，请稍后重试')
  }
}
