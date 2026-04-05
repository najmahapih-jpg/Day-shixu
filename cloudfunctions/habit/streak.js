/**
 * Canonical streak helpers — single source of truth.
 *
 * WeChat cloud functions are packaged per-directory, so this file is
 * COPIED (not imported) into each function's dir as `./streak.js` via
 * `scripts/sync-shared.js`. A parity Jest test verifies the copies match.
 *
 * Any change here MUST be followed by `node cloudfunctions/scripts/sync-shared.js`.
 */

/** Parse YYYY-MM-DD into UTC-midnight Date */
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * 判断习惯在指定日期是否需要打卡
 * frequency: daily | weekdays | weekends | custom (customDays: 1..7, 1=Mon)
 */
function isHabitActiveOnDate(habit, dateStr) {
  if (!habit || !habit.frequency || habit.frequency === 'daily') return true
  const dt = parseDate(dateStr)
  const wd = dt.getUTCDay() // 0=Sun ... 6=Sat
  if (habit.frequency === 'weekdays') return wd >= 1 && wd <= 5
  if (habit.frequency === 'weekends') return wd === 0 || wd === 6
  if (habit.frequency === 'custom' && Array.isArray(habit.customDays)) {
    const wd1to7 = wd === 0 ? 7 : wd
    return habit.customDays.includes(wd1to7)
  }
  return true
}

/**
 * 频率感知的连续天数计算（非活跃日跳过，不中断连续）
 *
 * When `today` is provided and an active day equal to `today` has neither
 * a check-in nor a freeze, the streak is NOT broken — today is treated as
 * an open day (grace), matching stats/getStreaks and backfill semantics.
 */
function calcStreak(recentDates, checkedDateSet, frozenDateSet, habit, today) {
  let streak = 0
  for (const date of recentDates) {
    if (!isHabitActiveOnDate(habit, date)) continue
    if (checkedDateSet.has(date) || (frozenDateSet && frozenDateSet.has(date))) {
      streak++
    } else if (today && date === today) {
      continue
    } else {
      break
    }
  }
  return streak
}

/** 计算最长连续天数（遍历全部 recentDates 找最大连续段） */
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

module.exports = {
  parseDate,
  isHabitActiveOnDate,
  calcStreak,
  calcLongestStreak,
}
