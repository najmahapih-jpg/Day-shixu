/**
 * Stats cloud function tests
 * Focus: date validation and range constraints
 */

const cloud = require('wx-server-sdk')
const { main } = require('../index')

const OPENID = 'test-openid'

beforeEach(() => {
  cloud.__resetDB()
  cloud.__setWXContext({ OPENID, APPID: 'test' })
})

describe('getHeatmap date validation', () => {
  test('rejects missing startDate', async () => {
    const res = await main({
      action: 'getHeatmap',
      data: { endDate: '2026-03-30' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('startDate')
  })

  test('rejects missing endDate', async () => {
    const res = await main({
      action: 'getHeatmap',
      data: { startDate: '2026-01-01' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('endDate')
  })

  test('rejects reversed date range (start > end)', async () => {
    const res = await main({
      action: 'getHeatmap',
      data: { startDate: '2026-12-01', endDate: '2026-01-01' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('不能晚于')
  })

  test('rejects range exceeding 400 days', async () => {
    const res = await main({
      action: 'getHeatmap',
      data: { startDate: '2024-01-01', endDate: '2026-03-30' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('400')
  })

  test('accepts valid date range', async () => {
    const res = await main({
      action: 'getHeatmap',
      data: { startDate: '2026-03-01', endDate: '2026-03-30' },
    })
    expect(res.code).toBe(0)
    expect(res.data.days).toBeDefined()
    expect(res.data.days.length).toBe(30)
  })
})

describe('getStreaks today grace period', () => {
  test('does not break streak when today is active but not yet checked in', async () => {
    const habitsCol = cloud.__getCol('habits')
    const checkInsCol = cloud.__getCol('check_ins')

    habitsCol.push({
      _id: 'streak-h1',
      _openid: OPENID,
      name: '每日习惯',
      frequency: 'daily',
      isArchived: false,
      streakCurrent: 3,
      streakLongest: 3,
      totalCompletions: 3,
    })

    // Checked in yesterday, day before, and day before that — but NOT today
    const today = new Date()
    const utc8 = new Date(today.getTime() + 8 * 3600 * 1000)
    const pad = (n) => String(n).padStart(2, '0')
    for (let i = 1; i <= 3; i++) {
      const d = new Date(utc8)
      d.setUTCDate(d.getUTCDate() - i)
      const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
      checkInsCol.push({
        _id: `ci-streak-${i}`,
        _openid: OPENID,
        habitId: 'streak-h1',
        date: dateStr,
        value: true,
      })
    }

    const res = await main({ action: 'getStreaks' })
    expect(res.code).toBe(0)
    // Current streak should be 3 (yesterday + 2 days before), NOT 0
    const habit = res.data.habits.find(h => h.id === 'streak-h1')
    expect(habit.currentStreak).toBeGreaterThanOrEqual(3)
  })
})

describe('getWeeklyComparison fair comparison', () => {
  test('lastWeek has the same number of days as thisWeek (partial-week parity)', async () => {
    const res = await main({ action: 'getWeeklyComparison' })
    expect(res.code).toBe(0)
    const { thisWeek, lastWeek } = res.data
    expect(Array.isArray(thisWeek)).toBe(true)
    expect(Array.isArray(lastWeek)).toBe(true)
    // The key invariant: both arrays must have equal length
    expect(lastWeek.length).toBe(thisWeek.length)
    // Each entry should have { day, rate } shape
    thisWeek.forEach(entry => {
      expect(entry).toHaveProperty('day')
      expect(entry).toHaveProperty('rate')
    })
    lastWeek.forEach(entry => {
      expect(entry).toHaveProperty('day')
      expect(entry).toHaveProperty('rate')
    })
    // thisWeek length must be between 1 and 7
    expect(thisWeek.length).toBeGreaterThanOrEqual(1)
    expect(thisWeek.length).toBeLessThanOrEqual(7)
  })
})

describe('edge cases', () => {
  test('missing OPENID returns error', async () => {
    cloud.__setWXContext({ OPENID: null })
    const res = await main({ action: 'getHeatmap', data: {} })
    expect(res.code).toBe(-1)
  })

  test('unknown action returns error', async () => {
    const res = await main({ action: 'nonexistent', data: {} })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('未知操作')
  })
})

// ── Pagination (F2) ────────────────────────────────────
// getStreaks must return every active habit even when user has >100
// (the previous implementation silently capped at wx-server-sdk's 100 limit).
describe('getStreaks pagination (F2 regression)', () => {
  test('returns all habits when user has >100 active habits', async () => {
    const habitsCol = cloud.__getCol('habits')
    const COUNT = 150
    for (let i = 0; i < COUNT; i++) {
      habitsCol.push({
        _id: `h-${i}`,
        _openid: OPENID,
        name: `habit-${i}`,
        frequency: 'daily',
        isArchived: false,
      })
    }
    const res = await main({ action: 'getStreaks' })
    expect(res.code).toBe(0)
    expect(res.data.habits.length).toBe(COUNT)
  })
})

// ── batchGetCheckIns cap-hit (F3 regression) ───────────
// When the maxRecords cap is crossed, caller MUST see truncated:true
// so downstream UI can surface partial-data warnings. Silent truncation
// is the bug we're guarding against.
describe('batchGetCheckIns cap-hit signal', () => {
  const { _test } = require('../index')
  const { batchGetCheckIns } = _test

  test('returns truncated:true when record count crosses the cap', async () => {
    const checkInsCol = cloud.__getCol('check_ins')
    // Seed 250 records — with cap=200 the 3rd page of 100 crosses the cap.
    for (let i = 0; i < 250; i++) {
      checkInsCol.push({
        _id: `ci-cap-${i}`,
        _openid: OPENID,
        habitId: 'any',
        date: '2026-03-01',
        value: true,
      })
    }
    const result = await batchGetCheckIns({ _openid: OPENID }, 200)
    // Records shape is still [{ _id, _openid, ... }]
    expect(Array.isArray(result.records)).toBe(true)
    expect(result.records.length).toBeGreaterThanOrEqual(200)
    expect(result.records[0]).toHaveProperty('_id')
    expect(result.records[0]).toHaveProperty('_openid')
    expect(result.truncated).toBe(true)
  })

  test('returns truncated:false when data fits under the cap', async () => {
    const checkInsCol = cloud.__getCol('check_ins')
    for (let i = 0; i < 50; i++) {
      checkInsCol.push({
        _id: `ci-nocap-${i}`,
        _openid: OPENID,
        habitId: 'any',
        date: '2026-03-01',
        value: true,
      })
    }
    const result = await batchGetCheckIns({ _openid: OPENID }, 200)
    expect(result.records.length).toBe(50)
    expect(result.truncated).toBe(false)
  })
})

// ── Weekly comparison dedup ────────────────────────────
// Duplicate rows for (habitId, date) — from legacy data or toggle-off-then-on
// cycles — must NOT inflate the day's completion count.
describe('getWeeklyComparison dedupes same-habit same-day records', () => {
  function mondayOfThisWeek() {
    const now = new Date()
    const utc8 = new Date(now.getTime() + 8 * 3600 * 1000)
    const wd = utc8.getUTCDay() // 0=Sun
    const diff = wd === 0 ? -6 : 1 - wd
    utc8.setUTCDate(utc8.getUTCDate() + diff)
    const pad = (n) => String(n).padStart(2, '0')
    return `${utc8.getUTCFullYear()}-${pad(utc8.getUTCMonth() + 1)}-${pad(utc8.getUTCDate())}`
  }

  test('two rows for same habit on same day count as one', async () => {
    const habitsCol = cloud.__getCol('habits')
    habitsCol.push({
      _id: 'wc-h1',
      _openid: OPENID,
      name: 'weekly habit',
      frequency: 'daily',
      isArchived: false,
    })
    const monday = mondayOfThisWeek()
    // Seed two duplicate records for (wc-h1, monday) — simulating legacy drift
    const checkInsCol = cloud.__getCol('check_ins')
    checkInsCol.push({
      _id: 'dup-1',
      _openid: OPENID,
      habitId: 'wc-h1',
      date: monday,
      value: true,
    })
    checkInsCol.push({
      _id: 'dup-2',
      _openid: OPENID,
      habitId: 'wc-h1',
      date: monday,
      value: true,
    })
    const res = await main({ action: 'getWeeklyComparison' })
    expect(res.code).toBe(0)
    // Monday (index 0) has one habit active, one counted → rate = 1.0 not 2.0
    const mondayData = res.data.thisWeek[0]
    expect(mondayData.rate).toBe(1)
  })
})

// ── Heatmap dedup parity with weekly-comparison ────────
describe('getHeatmap dedupes same-habit same-day records', () => {
  test('two rows for same (habit, date) count as one in day.count', async () => {
    cloud.__getCol('habits').push({
      _id: 'hm-h1',
      _openid: OPENID,
      name: 'heatmap habit',
      frequency: 'daily',
      isArchived: false,
    })
    // Seed duplicate rows for (hm-h1, 2026-03-15)
    const checkInsCol = cloud.__getCol('check_ins')
    checkInsCol.push({
      _id: 'hm-dup-1',
      _openid: OPENID,
      habitId: 'hm-h1',
      date: '2026-03-15',
      value: true,
    })
    checkInsCol.push({
      _id: 'hm-dup-2',
      _openid: OPENID,
      habitId: 'hm-h1',
      date: '2026-03-15',
      value: true,
    })
    const res = await main({
      action: 'getHeatmap',
      data: { startDate: '2026-03-15', endDate: '2026-03-15' },
    })
    expect(res.code).toBe(0)
    const day = res.data.days.find(d => d.date === '2026-03-15')
    expect(day).toBeTruthy()
    expect(day.count).toBe(1)   // deduped, not 2
    expect(day.total).toBe(1)
    expect(day.rate).toBe(1)    // caps at 1.0
  })

  test('two different habits on same day count as two', async () => {
    cloud.__getCol('habits').push({
      _id: 'hm-a',
      _openid: OPENID,
      name: 'a',
      frequency: 'daily',
      isArchived: false,
    })
    cloud.__getCol('habits').push({
      _id: 'hm-b',
      _openid: OPENID,
      name: 'b',
      frequency: 'daily',
      isArchived: false,
    })
    const checkInsCol = cloud.__getCol('check_ins')
    checkInsCol.push({
      _id: 'hm-a-1', _openid: OPENID, habitId: 'hm-a', date: '2026-03-15', value: true,
    })
    checkInsCol.push({
      _id: 'hm-b-1', _openid: OPENID, habitId: 'hm-b', date: '2026-03-15', value: true,
    })
    const res = await main({
      action: 'getHeatmap',
      data: { startDate: '2026-03-15', endDate: '2026-03-15' },
    })
    expect(res.code).toBe(0)
    const day = res.data.days.find(d => d.date === '2026-03-15')
    expect(day.count).toBe(2)
    expect(day.total).toBe(2)
    expect(day.rate).toBe(1)
  })
})

