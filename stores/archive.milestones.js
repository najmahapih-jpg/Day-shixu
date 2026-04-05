/**
 * Historical milestone computation for the archive view.
 *
 * Extracted as pure JS so the contract is testable under the existing
 * jest config without introducing a TypeScript test toolchain.
 */

const MILESTONE_DAYS = [7, 21, 30, 100]
const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseDateUtc(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/**
 * Compute, per habit, the dates on which a milestone streak was reached
 * based on that habit's actual historical check-in sequence.
 *
 * @param {Map<string, string[]>} checkInsByHabit habitId → list of YYYY-MM-DD
 * @returns {Map<string, Set<string>>} habitId → set of milestone dates
 */
function computeHistoricalMilestones(checkInsByHabit) {
  const result = new Map()
  for (const [habitId, dates] of checkInsByHabit) {
    const sorted = Array.from(new Set(dates)).sort()
    const milestoneDates = new Set()
    let streak = 0
    let prevTs = -Infinity
    for (const d of sorted) {
      const ts = parseDateUtc(d)
      streak = ts - prevTs === MS_PER_DAY ? streak + 1 : 1
      prevTs = ts
      if (MILESTONE_DAYS.includes(streak)) {
        milestoneDates.add(d)
      }
    }
    if (milestoneDates.size > 0) result.set(habitId, milestoneDates)
  }
  return result
}

module.exports = { computeHistoricalMilestones, MILESTONE_DAYS }
