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
