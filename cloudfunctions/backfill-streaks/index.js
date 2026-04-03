/**
 * backfill-streaks — 一次性回填习惯连续天数
 *
 * 使用与 habit/index.js 相同的频率感知 calcStreak / calcLongestStreak 逻辑，
 * 从 check_ins + freeze 记录中重新计算每个非归档习惯的 streakCurrent 和 streakLongest。
 *
 * 调用参数 (event):
 *   dryRun    {boolean}  true = 只报告差异，不写入 (默认 true)
 *   batchSize {number}   每批处理习惯数 (默认 50，最大 200)
 *   skip      {number}   跳过前 N 个习惯（用于分批续跑）
 *   habitId   {string}   只处理指定习惯（调试用）
 *   openid    {string}   只处理指定用户的习惯（分批用）
 *
 * 返回:
 *   { processed, changed, skipped, errors, details[] }
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const habitsCol = db.collection('habits')
const checkInsCol = db.collection('check_ins')

const STREAK_LOOKBACK = 365
const FREEZE_HABIT_ID = '__freeze__'

// ── Helpers (canonical copies from habit/index.js) ────

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

function isHabitActiveOnDate(habit, dateStr) {
  if (!habit || !habit.frequency || habit.frequency === 'daily') return true
  const dt = parseDate(dateStr)
  const wd = dt.getUTCDay()
  if (habit.frequency === 'weekdays') return wd >= 1 && wd <= 5
  if (habit.frequency === 'weekends') return wd === 0 || wd === 6
  if (habit.frequency === 'custom' && Array.isArray(habit.customDays)) {
    const wd1to7 = wd === 0 ? 7 : wd
    return habit.customDays.includes(wd1to7)
  }
  return true
}

function calcStreak(recentDates, checkedDateSet, frozenDateSet, habit, today) {
  let streak = 0
  for (let i = 0; i < recentDates.length; i++) {
    const date = recentDates[i]
    if (!isHabitActiveOnDate(habit, date)) continue
    if (checkedDateSet.has(date) || (frozenDateSet && frozenDateSet.has(date))) {
      streak++
    } else if (date === today) {
      // 今天是活跃日但尚未打卡 — 跳过，不中断连续（与 stats/getStreaks 一致）
      continue
    } else {
      break
    }
  }
  return streak
}

function calcLongestStreak(recentDates, checkedDateSet, frozenDateSet, habit) {
  let longest = 0
  let current = 0
  for (const date of recentDates) {
    if (!isHabitActiveOnDate(habit, date)) continue
    if (checkedDateSet.has(date) || (frozenDateSet && frozenDateSet.has(date))) {
      current++
      if (current > longest) longest = current
    } else {
      current = 0
    }
  }
  return longest
}

// ── Backfill logic ────────────────────────────────────

async function fetchHabits({ skip = 0, batchSize = 50, habitId, openid }) {
  if (habitId) {
    try {
      const { data } = await habitsCol.doc(habitId).get()
      return [data]
    } catch {
      return []
    }
  }

  const where = { isArchived: _.neq(true) }
  if (openid) where._openid = openid

  const all = []
  const PAGE = 100
  let fetched = 0
  let dbSkip = skip

  while (fetched < batchSize) {
    const limit = Math.min(PAGE, batchSize - fetched)
    const { data } = await habitsCol.where(where).skip(dbSkip).limit(limit).get()
    all.push(...data)
    fetched += data.length
    dbSkip += data.length
    if (data.length < limit) break
  }
  return all
}

async function processHabit(habit, today, dryRun) {
  const recentDates = getRecentDates(today, STREAK_LOOKBACK)
  const lookbackStart = recentDates[recentDates.length - 1]

  const [checkData, freezeData] = await Promise.all([
    paginatedGet(
      checkInsCol
        .where({
          _openid: habit._openid,
          habitId: habit._id,
          date: _.gte(lookbackStart).and(_.lte(today)),
        })
        .orderBy('date', 'desc')
    ),
    paginatedGet(
      checkInsCol
        .where({
          _openid: habit._openid,
          habitId: FREEZE_HABIT_ID,
          date: _.gte(lookbackStart).and(_.lte(today)),
        })
        .orderBy('date', 'desc')
    ),
  ])

  const checkedSet = new Set(checkData.map(r => r.date))
  const frozenSet = new Set(freezeData.map(r => r.date))

  const newCurrent = calcStreak(recentDates, checkedSet, frozenSet, habit, today)
  const newLongest = calcLongestStreak(recentDates, checkedSet, frozenSet, habit)

  const oldCurrent = habit.streakCurrent || 0
  const oldLongest = habit.streakLongest || 0

  const changed = newCurrent !== oldCurrent || newLongest !== oldLongest

  if (changed && !dryRun) {
    await habitsCol.doc(habit._id).update({
      data: {
        streakCurrent: newCurrent,
        streakLongest: newLongest,
        updatedAt: db.serverDate(),
      }
    })
  }

  return {
    habitId: habit._id,
    name: habit.name,
    frequency: habit.frequency || 'daily',
    changed,
    oldCurrent,
    newCurrent,
    oldLongest,
    newLongest,
  }
}

// ── Entry point ───────────────────────────────────────

exports.main = async (event) => {
  const {
    dryRun = true,
    batchSize: rawBatchSize = 50,
    skip = 0,
    habitId,
    openid,
  } = event || {}

  const batchSize = Math.min(Math.max(1, rawBatchSize), 200)
  const today = toDateStr(new Date())

  console.log(`[backfill-streaks] start: dryRun=${dryRun}, batchSize=${batchSize}, skip=${skip}, habitId=${habitId || '-'}, openid=${openid || '-'}, today=${today}`)

  const habits = await fetchHabits({ skip, batchSize, habitId, openid })
  console.log(`[backfill-streaks] fetched ${habits.length} habits`)

  let processed = 0
  let changed = 0
  let errors = 0
  const details = []

  for (const habit of habits) {
    try {
      const result = await processHabit(habit, today, dryRun)
      processed++
      if (result.changed) {
        changed++
        details.push(result)
        console.log(`[backfill-streaks] ${dryRun ? 'WOULD UPDATE' : 'UPDATED'}: ${habit._id} (${habit.name}) current: ${result.oldCurrent}→${result.newCurrent}, longest: ${result.oldLongest}→${result.newLongest}`)
      }
    } catch (err) {
      errors++
      console.error(`[backfill-streaks] ERROR processing ${habit._id}:`, err.message)
      details.push({ habitId: habit._id, name: habit.name, error: err.message })
    }
  }

  const summary = {
    dryRun,
    today,
    skip,
    batchSize,
    processed,
    changed,
    unchanged: processed - changed,
    errors,
    details,
    nextSkip: habits.length === batchSize ? skip + batchSize : null,
  }

  console.log(`[backfill-streaks] done: processed=${processed}, changed=${changed}, errors=${errors}, nextSkip=${summary.nextSkip}`)
  return { code: 0, data: summary }
}
