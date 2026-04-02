/**
 * Stats cloud function tests
 * Focus: date validation and range constraints
 */

jest.mock('wx-server-sdk')
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
