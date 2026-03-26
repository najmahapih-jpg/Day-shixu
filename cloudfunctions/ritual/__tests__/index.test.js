/**
 * Ritual cloud function tests
 * Focus: content security, CRUD, execute
 */

jest.mock('wx-server-sdk')
const cloud = require('wx-server-sdk')
const { main } = require('../index')

const OPENID = 'test-openid'

beforeEach(() => {
  cloud.__resetDB()
  cloud.__setWXContext({ OPENID, APPID: 'test' })
  cloud.__setMsgSecCheckResult({ result: { suggest: 'pass', label: 0 } })
  cloud.openapi.security.msgSecCheck.mockClear()
})

// ── Create ──────────────────────────────────────────────

describe('ritual create', () => {
  test('creates ritual with valid name', async () => {
    const res = await main({
      action: 'create',
      ritual: { name: '晨间仪式', type: 'morning', habitIds: [] },
    })
    expect(res.code).toBe(0)
    expect(res.data.name).toBe('晨间仪式')
  })

  test('calls msgSecCheck on ritual name', async () => {
    await main({
      action: 'create',
      ritual: { name: '测试仪式' },
    })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '测试仪式', version: 2 }),
    )
  })

  test('rejects risky ritual name', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'create',
      ritual: { name: '违规仪式名' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('违规')
  })

  test('rejects missing name', async () => {
    const res = await main({
      action: 'create',
      ritual: { type: 'morning' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('名称必填')
  })
})

// ── Update ──────────────────────────────────────────────

describe('ritual update', () => {
  let ritualId

  beforeEach(async () => {
    const res = await main({
      action: 'create',
      ritual: { name: '原始仪式', type: 'morning', habitIds: [] },
    })
    ritualId = res.data._id
  })

  test('checks updated name', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({
      action: 'update',
      id: ritualId,
      ritual: { name: '新名称' },
    })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '新名称' }),
    )
  })

  test('rejects risky updated name', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'update',
      id: ritualId,
      ritual: { name: '违规' },
    })
    expect(res.code).toBe(-1)
  })

  test('allows update without name change', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    const res = await main({
      action: 'update',
      id: ritualId,
      ritual: { type: 'evening' },
    })
    expect(res.code).toBe(0)
    // No name provided, so no msgSecCheck call
    expect(cloud.openapi.security.msgSecCheck).not.toHaveBeenCalled()
  })
})

// ── Delete ──────────────────────────────────────────────

describe('ritual delete', () => {
  test('deletes own ritual', async () => {
    const createRes = await main({
      action: 'create',
      ritual: { name: '删除测试', habitIds: [] },
    })
    const res = await main({ action: 'delete', id: createRes.data._id })
    expect(res.code).toBe(0)
  })

  test('rejects deleting other user ritual', async () => {
    // Insert a ritual owned by another user
    const col = cloud.__getCol('rituals')
    col.push({ _id: 'other-ritual', _openid: 'other-user', name: 'Other' })
    const res = await main({ action: 'delete', id: 'other-ritual' })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('无权')
  })
})

// ── Execute ─────────────────────────────────────────────

describe('ritual execute', () => {
  let ritualId, habitId

  beforeEach(async () => {
    // Create a habit
    const habitsCol = cloud.__getCol('habits')
    habitId = 'test-habit-1'
    habitsCol.push({
      _id: habitId,
      _openid: OPENID,
      name: '跑步',
      isArchived: false,
      streakCurrent: 0,
      streakLongest: 0,
      totalCompletions: 0,
    })

    // Create a ritual linked to the habit
    const res = await main({
      action: 'create',
      ritual: { name: '晨跑仪式', type: 'morning', habitIds: [habitId] },
    })
    ritualId = res.data._id
  })

  test('executes ritual and creates check-ins', async () => {
    const res = await main({
      action: 'execute',
      ritualId,
      completedHabitIds: [habitId],
      date: '2026-03-25',
    })
    expect(res.code).toBe(0)
    expect(res.data.checkIns.length).toBe(1)
    expect(res.data.date).toBe('2026-03-25')
  })

  test('rejects execute with empty habitIds', async () => {
    const res = await main({
      action: 'execute',
      ritualId,
      completedHabitIds: [],
    })
    expect(res.code).toBe(-1)
  })

  test('rejects execute with too many habits', async () => {
    const manyIds = Array.from({ length: 101 }, (_, i) => `h${i}`)
    const res = await main({
      action: 'execute',
      ritualId,
      completedHabitIds: manyIds,
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('过多')
  })
})

// ── Edge cases ──────────────────────────────────────────

describe('edge cases', () => {
  test('missing OPENID returns error', async () => {
    cloud.__setWXContext({ OPENID: null })
    const res = await main({ action: 'list' })
    expect(res.code).toBe(-1)
  })
})
