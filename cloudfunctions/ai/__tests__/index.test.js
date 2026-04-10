const cloud = require('wx-server-sdk')
const { main } = require('../index')

const OPENID = 'ai-test-openid'

beforeEach(() => {
  cloud.__resetDB()
  cloud.__setWXContext({ OPENID, APPID: 'test' })
})

describe('generateHabitInsight', () => {
  test('returns empty-state insight when user has no active habits', async () => {
    const res = await main({ action: 'generateHabitInsight', data: {} })

    expect(res.code).toBe(0)
    expect(res.data.source).toBe('rule-engine')
    expect(res.data.model).toBe('rule-engine-v1')
    expect(Array.isArray(res.data.recommendations)).toBe(true)
    expect(Array.isArray(res.data.slogans)).toBe(true)
    expect(res.data.trend).toEqual(
      expect.objectContaining({
        thisWeekRate: 0,
        lastWeekRate: 0,
        delta: 0,
        direction: 'flat',
      }),
    )
  })

  test('returns typed insight structure for active habits and check-ins', async () => {
    const habitsCol = cloud.__getCol('habits')
    const checkInsCol = cloud.__getCol('check_ins')

    const now = new Date()
    const utc8 = new Date(now.getTime() + 8 * 3600 * 1000)
    const pad = (n) => String(n).padStart(2, '0')
    const today = `${utc8.getUTCFullYear()}-${pad(utc8.getUTCMonth() + 1)}-${pad(utc8.getUTCDate())}`

    habitsCol.push({
      _id: 'ai-h1',
      _openid: OPENID,
      name: 'Drink Water',
      frequency: 'daily',
      isArchived: false,
    })

    checkInsCol.push({
      _id: `ci-${today}`,
      _openid: OPENID,
      habitId: 'ai-h1',
      date: today,
      value: true,
    })

    const res = await main({ action: 'generateHabitInsight', data: {} })

    expect(res.code).toBe(0)
    expect(typeof res.data.summary).toBe('string')
    expect(Array.isArray(res.data.recommendations)).toBe(true)
    expect(Array.isArray(res.data.slogans)).toBe(true)
    expect(res.data.trend).toEqual(
      expect.objectContaining({
        thisWeekRate: expect.any(Number),
        lastWeekRate: expect.any(Number),
        delta: expect.any(Number),
        direction: expect.stringMatching(/^(up|down|flat)$/),
        analysis: expect.any(String),
        bestDay: expect.any(String),
      }),
    )
  })
})

describe('ai edge cases', () => {
  test('missing OPENID returns error', async () => {
    cloud.__setWXContext({ OPENID: null, APPID: 'test' })
    const res = await main({ action: 'generateHabitInsight', data: {} })
    expect(res.code).toBe(-1)
  })

  test('unknown action returns error', async () => {
    const res = await main({ action: 'unknown', data: {} })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('未知操作')
  })
})
