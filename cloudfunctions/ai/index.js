const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const habitsCol = db.collection('habits')
const checkInsCol = db.collection('check_ins')

/** 分页获取，绕过 wx-server-sdk 单次 100 条硬限制 */
async function batchGet(collection, where, maxRecords = 2000) {
  const PAGE = 100
  let all = []
  let skip = 0
  while (all.length < maxRecords) {
    const { data } = await collection.where(where).skip(skip).limit(PAGE).get()
    all = all.concat(data)
    if (data.length < PAGE) break
    skip += PAGE
  }
  return all
}

function ok(data) {
  return { code: 0, data }
}

function fail(message) {
  return { code: -1, message }
}

function toDateStr(input) {
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
  const date = input ? new Date(input) : new Date()
  const utc8 = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const d = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toIsoStr(input = new Date()) {
  const date = input ? new Date(input) : new Date()
  const utc8 = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const d = String(utc8.getUTCDate()).padStart(2, '0')
  const hh = String(utc8.getUTCHours()).padStart(2, '0')
  const mm = String(utc8.getUTCMinutes()).padStart(2, '0')
  const ss = String(utc8.getUTCSeconds()).padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}+08:00`
}

function parseDate(dateStr) {
  const [y, m, d] = (dateStr || '').split('-').map(Number)
  if (!y || !m || !d) return new Date(Date.UTC(1970, 0, 1))
  return new Date(Date.UTC(y, m - 1, d))
}

function offsetDate(dateStr, offset) {
  const dt = parseDate(dateStr)
  dt.setUTCDate(dt.getUTCDate() + offset)
  return toDateStr(dt)
}

function getWeekday0to6(dateStr) {
  return parseDate(dateStr).getUTCDay()
}

function getWeekday1to7(dateStr) {
  const day = getWeekday0to6(dateStr)
  return day === 0 ? 7 : day
}

function getMonday(dateStr) {
  const day = getWeekday0to6(dateStr)
  const delta = day === 0 ? -6 : 1 - day
  return offsetDate(dateStr, delta)
}

function clampRate(value) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function shouldRunOnDate(habit, dateStr) {
  if (!habit) return false
  if (habit.isArchived) return false

  const startDate = habit.startDate ? toDateStr(habit.startDate) : ''
  const endDate = habit.endDate ? toDateStr(habit.endDate) : ''
  if (startDate && dateStr < startDate) return false
  if (endDate && dateStr > endDate) return false

  const weekday = getWeekday1to7(dateStr)
  const frequency = habit.frequency || 'daily'

  if (frequency === 'daily') return true
  if (frequency === 'weekdays') return weekday >= 1 && weekday <= 5
  if (frequency === 'weekends') return weekday === 6 || weekday === 7
  if (frequency === 'custom') {
    const customDays = Array.isArray(habit.customDays) ? habit.customDays : []
    return customDays.some((d) => {
      if (d === 0) return weekday === 7
      return Number(d) === weekday
    })
  }
  return true
}

function getDayRate(dateStr, activeHabits, dayDoneMap) {
  const scheduledIds = new Set()
  for (const habit of activeHabits) {
    if (!habit || !habit._id) continue
    if (shouldRunOnDate(habit, dateStr)) {
      scheduledIds.add(habit._id)
    }
  }

  const total = scheduledIds.size
  if (total === 0) return 0

  const doneSet = dayDoneMap.get(dateStr) || new Set()
  let done = 0
  doneSet.forEach((id) => {
    if (scheduledIds.has(id)) done += 1
  })

  return clampRate((done / total) * 100)
}

function avgRate(list) {
  if (!Array.isArray(list) || list.length === 0) return 0
  const sum = list.reduce((acc, item) => acc + clampRate(item), 0)
  return clampRate(sum / list.length)
}

function weekdayLabel(dateStr) {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return labels[getWeekday0to6(dateStr)] || ''
}

function getTrendDirection(delta) {
  if (delta >= 3) return 'up'
  if (delta <= -3) return 'down'
  return 'flat'
}

function buildTrendAnalysis(direction, delta) {
  if (direction === 'up') {
    return `本周较上周提升 ${Math.abs(delta)}%，节奏在稳步上升。`
  }
  if (direction === 'down') {
    return `本周较上周下降 ${Math.abs(delta)}%，建议先收紧目标，恢复连续性。`
  }
  return '本周与上周基本持平，建议固定关键时段提高稳定性。'
}

function buildRecommendations(context) {
  const list = []

  if (context.activeCount >= 8) {
    list.push('当前习惯数量较多，建议先聚焦 3 到 5 个核心习惯。')
  } else if (context.activeCount <= 2) {
    list.push('当前习惯数量较少，建议新增 1 个低成本习惯增强节奏。')
  } else {
    list.push('保持当前习惯规模，优先优化触发时点和完成顺序。')
  }

  if (context.todayTotal > 0 && context.todayDone < context.todayTotal) {
    list.push('优先完成最短耗时的一个习惯，尽快建立今日正反馈。')
  } else {
    list.push('今日完成情况良好，建议提前安排明天的第一个习惯。')
  }

  if (context.thisWeekRate < 60) {
    list.push('本周完成率偏低，建议把目标改为“先连续 3 天”。')
  } else if (context.thisWeekRate < 80) {
    list.push('本周完成率稳定，可把提醒时间固定到同一时段。')
  } else {
    list.push('本周完成率较高，可逐步增加目标值或难度。')
  }

  if (context.bestDay) {
    list.push(`你在 ${context.bestDay} 表现最好，可复用当天的时间安排。`)
  }

  return list.slice(0, 4)
}

function buildSlogans(context) {
  const first = context.direction === 'up'
    ? '稳住节奏，增长会自己出现'
    : context.direction === 'down'
      ? '先恢复连续，再提高强度'
      : '每天完成一点，长期自然领先'

  const second = context.todayRate >= 80
    ? '今天的完成率，是明天的底气'
    : '把最小行动做到位，状态会跟上来'

  return [
    first,
    second,
    '不是一次冲刺，而是长期稳定',
  ]
}

async function generateHabitInsight(openid) {
  const today = toDateStr(new Date())
  const monday = getMonday(today)
  const sunday = offsetDate(monday, 6)
  const lastMonday = offsetDate(monday, -7)
  const lastSunday = offsetDate(lastMonday, 6)

  const habitsData = await batchGet(habitsCol, { _openid: openid, isArchived: _.neq(true) }, 500)
  const activeHabits = (habitsData || []).filter((h) => !h.isArchived)

  if (activeHabits.length === 0) {
    return ok({
      generatedAt: toIsoStr(),
      summary: '当前还没有活跃习惯，先创建 1 个最容易坚持的习惯再开始分析。',
      recommendations: [
        '先从 1 个最小习惯开始，例如每天 5 分钟整理或拉伸。',
        '固定提醒时间，降低启动成本。',
        '连续完成 3 天后再增加新习惯。',
      ],
      slogans: [
        '先开始，再优化',
        '小步快走，长期有效',
        '稳定比速度更重要',
      ],
      trend: {
        thisWeekRate: 0,
        lastWeekRate: 0,
        delta: 0,
        direction: 'flat',
        analysis: '暂无可分析数据，创建并完成习惯后会生成趋势。',
        bestDay: '',
      },
      source: 'rule-engine',
      model: 'rule-engine-v1',
    })
  }

  const activeIdSet = new Set(activeHabits.map((h) => h._id).filter(Boolean))
  const checkInsData = await batchGet(checkInsCol, {
    _openid: openid,
    habitId: _.neq('__freeze__'),
    date: _.gte(lastMonday).and(_.lte(sunday)),
  })

  const dayDoneMap = new Map()
  for (const item of (checkInsData || [])) {
    if (!item || !item.habitId || !item.date) continue
    if (!activeIdSet.has(item.habitId)) continue
    const dateStr = toDateStr(item.date)
    const set = dayDoneMap.get(dateStr) || new Set()
    set.add(item.habitId)
    dayDoneMap.set(dateStr, set)
  }

  const thisWeekDates = Array.from({ length: 7 }, (_, i) => offsetDate(monday, i))
  const lastWeekDates = Array.from({ length: 7 }, (_, i) => offsetDate(lastMonday, i))
  const thisWeekRates = thisWeekDates.map((d) => getDayRate(d, activeHabits, dayDoneMap))
  const lastWeekRates = lastWeekDates.map((d) => getDayRate(d, activeHabits, dayDoneMap))

  const thisWeekRate = avgRate(thisWeekRates)
  const lastWeekRate = avgRate(lastWeekRates)
  const delta = thisWeekRate - lastWeekRate
  const direction = getTrendDirection(delta)

  const todayTotal = activeHabits.filter((habit) => shouldRunOnDate(habit, today)).length
  const todayDoneSet = dayDoneMap.get(today) || new Set()
  const todayDone = todayDoneSet.size
  const todayRate = todayTotal > 0 ? clampRate((todayDone / todayTotal) * 100) : 0

  let bestDay = ''
  let bestRate = -1
  thisWeekDates.forEach((dateStr, idx) => {
    if (thisWeekRates[idx] > bestRate) {
      bestRate = thisWeekRates[idx]
      bestDay = weekdayLabel(dateStr)
    }
  })

  const summary = `当前共有 ${activeHabits.length} 个活跃习惯，今日完成 ${todayDone}/${todayTotal}，本周平均完成率 ${thisWeekRate}%。`
  const context = {
    activeCount: activeHabits.length,
    todayDone,
    todayTotal,
    todayRate,
    thisWeekRate,
    lastWeekRate,
    delta,
    direction,
    bestDay,
  }

  return ok({
    generatedAt: toIsoStr(),
    summary,
    recommendations: buildRecommendations(context),
    slogans: buildSlogans(context),
    trend: {
      thisWeekRate,
      lastWeekRate,
      delta,
      direction,
      analysis: buildTrendAnalysis(direction, delta),
      bestDay,
    },
    source: 'rule-engine',
    model: 'rule-engine-v1',
  })
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const action = event.action
  try {
    switch (action) {
      case 'generateHabitInsight':
        return await generateHabitInsight(OPENID)
      default:
        return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[ai/' + action + ']', err)
    return fail('服务器错误，请稍后重试')
  }
}
