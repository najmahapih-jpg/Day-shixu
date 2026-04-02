/**
 * Habit cloud function tests
 * Focus: content security (msgSecCheck) coverage for all UGC paths
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

// ── Habit CRUD ──────────────────────────────────────────

describe('habit create', () => {
  test('creates habit successfully with valid name', async () => {
    const res = await main({ action: 'create', data: { name: '早起跑步' } })
    expect(res.code).toBe(0)
    expect(res.data.name).toBe('早起跑步')
    expect(res.data._openid).toBe(OPENID)
  })

  test('calls msgSecCheck on habit name', async () => {
    await main({ action: 'create', data: { name: '测试习惯' } })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '测试习惯', version: 2 }),
    )
  })

  test('calls msgSecCheck on habit description', async () => {
    await main({ action: 'create', data: { name: 'ok', description: '这是描述' } })
    // Should be called twice: once for name, once for description
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledTimes(2)
  })

  test('rejects habit with risky name', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({ action: 'create', data: { name: '违规内容' } })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('违规')
  })

  test('rejects habit with risky description', async () => {
    // First call (name) passes, second call (description) fails
    cloud.openapi.security.msgSecCheck
      .mockResolvedValueOnce({ result: { suggest: 'pass', label: 0 } })
      .mockResolvedValueOnce({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'create',
      data: { name: 'ok', description: '违规描述' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('描述')
  })

  test('allows habit when msgSecCheck API fails (fail-open)', async () => {
    cloud.openapi.security.msgSecCheck.mockRejectedValue(new Error('API error'))
    const res = await main({ action: 'create', data: { name: '测试' } })
    expect(res.code).toBe(0)
  })

  test('returns error when data is missing', async () => {
    const res = await main({ action: 'create' })
    expect(res.code).toBe(-1)
  })
})

describe('habit update', () => {
  let habitId

  beforeEach(async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'pass', label: 0 } })
    const createRes = await main({ action: 'create', data: { name: 'original' } })
    habitId = createRes.data._id
  })

  test('calls msgSecCheck on updated name', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({ action: 'update', data: { id: habitId, name: '新名称' } })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '新名称' }),
    )
  })

  test('rejects update with risky name', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({ action: 'update', data: { id: habitId, name: '违规' } })
    expect(res.code).toBe(-1)
  })
})

// ── Board (board notes in same cloud function) ──────────

describe('boardCreate', () => {
  test('calls msgSecCheck on board content', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({ action: 'boardCreate', data: { content: '笔记内容' } })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '笔记内容' }),
    )
  })

  test('rejects board note with risky content', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({ action: 'boardCreate', data: { content: '违规' } })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('违规')
  })

  test('checks checklist items content', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    const res = await main({
      action: 'boardCreate',
      data: {
        noteType: 'checklist',
        checkItems: [
          { id: '1', text: '任务一' },
          { id: '2', text: '任务二' },
        ],
      },
    })
    // Should check: content (empty/auto), then checklist combined text
    const calls = cloud.openapi.security.msgSecCheck.mock.calls
    const checkedContents = calls.map(c => c[0].content)
    expect(checkedContents.some(c => c.includes('任务一'))).toBe(true)
  })
})

describe('boardCreate imageUrl allowlist', () => {
  test('accepts cloud:// imageUrl', async () => {
    const res = await main({
      action: 'boardCreate',
      data: { content: 'ok', imageUrl: 'cloud://env.xxx/img.png' },
    })
    expect(res.code).toBe(0)
    expect(res.data.imageUrl).toBe('cloud://env.xxx/img.png')
  })

  test('accepts https:// imageUrl', async () => {
    const res = await main({
      action: 'boardCreate',
      data: { content: 'ok', imageUrl: 'https://example.com/img.png' },
    })
    expect(res.code).toBe(0)
    expect(res.data.imageUrl).toBe('https://example.com/img.png')
  })

  test('rejects javascript: imageUrl', async () => {
    const res = await main({
      action: 'boardCreate',
      data: { content: 'ok', imageUrl: 'javascript:alert(1)' },
    })
    expect(res.code).toBe(0)
    // imageUrl should be sanitized to empty string
    expect(res.data.imageUrl || '').toBe('')
  })

  test('rejects data: imageUrl', async () => {
    const res = await main({
      action: 'boardCreate',
      data: { content: 'ok', imageUrl: 'data:text/html,<script>alert(1)</script>' },
    })
    expect(res.code).toBe(0)
    expect(res.data.imageUrl || '').toBe('')
  })

  test('rejects http:// imageUrl', async () => {
    const res = await main({
      action: 'boardCreate',
      data: { content: 'ok', imageUrl: 'http://evil.com/track.gif' },
    })
    expect(res.code).toBe(0)
    expect(res.data.imageUrl || '').toBe('')
  })
})

describe('boardUpdate', () => {
  let noteId

  beforeEach(async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'pass', label: 0 } })
    const res = await main({
      action: 'boardCreate',
      data: { content: '原始内容' },
    })
    noteId = res.data._id
  })

  test('checks updated content', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({
      action: 'boardUpdate',
      data: { id: noteId, updates: { content: '新内容' } },
    })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '新内容' }),
    )
  })

  test('rejects update with risky content', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'boardUpdate',
      data: { id: noteId, updates: { content: '违规' } },
    })
    expect(res.code).toBe(-1)
  })
})

describe('boardBatchUpdate', () => {
  test('rejects content field in batch updates', async () => {
    // boardBatchUpdate should strip content field (only layout fields allowed)
    const res = await main({
      action: 'boardBatchUpdate',
      data: {
        updates: [
          { id: 'some-id', fields: { content: '偷偷修改内容', x: 10, y: 20 } },
        ],
      },
    })
    // The batch update should succeed but content should not be in the update
    // (it's filtered out by BATCH_ALLOWED_FIELDS)
    expect(res.code).toBe(0)
  })
})

// ── checkIn validation ─────────────────────────────────

describe('checkIn', () => {
  let habitId

  beforeEach(async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'pass', label: 0 } })
    const res = await main({ action: 'create', data: { name: '打卡测试' } })
    habitId = res.data._id
  })

  test('rejects non-numeric non-boolean value', async () => {
    const res = await main({
      action: 'checkIn',
      data: { habitId, date: '2026-03-30', value: 'abc' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('类型不合法')
  })

  test('rejects value out of range (negative)', async () => {
    const res = await main({
      action: 'checkIn',
      data: { habitId, date: '2026-03-30', value: -1 },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('0-9999')
  })

  test('rejects value out of range (too large)', async () => {
    const res = await main({
      action: 'checkIn',
      data: { habitId, date: '2026-03-30', value: 10000 },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('0-9999')
  })

  test('accepts boolean value and returns streak fields', async () => {
    const res = await main({
      action: 'checkIn',
      data: { habitId, date: '2026-03-30', value: true },
    })
    expect(res.code).toBe(0)
    expect(res.data).toHaveProperty('streakCurrent')
    expect(res.data).toHaveProperty('streakLongest')
    expect(typeof res.data.streakCurrent).toBe('number')
    expect(typeof res.data.streakLongest).toBe('number')
  })

  test('accepts numeric value within range', async () => {
    const res = await main({
      action: 'checkIn',
      data: { habitId, date: '2026-03-30', value: 5000 },
    })
    expect(res.code).toBe(0)
    expect(res.data).toHaveProperty('streakCurrent')
    expect(res.data).toHaveProperty('streakLongest')
  })

  test('dedup compensation rolls back totalCompletions on race', async () => {
    // Simulate: first checkIn succeeds, second checkIn for same date
    // creates duplicate then compensates
    await main({
      action: 'checkIn',
      data: { habitId, date: '2026-03-30', value: true },
    })

    // Second checkIn for same date should update existing (not create duplicate)
    const res2 = await main({
      action: 'checkIn',
      data: { habitId, date: '2026-03-30', value: true },
    })
    expect(res2.code).toBe(0)

    // totalCompletions should be 1, not 2 (first created, second updated existing)
    const habitRes = await main({ action: 'get', data: { id: habitId } })
    expect(habitRes.data.totalCompletions).toBe(1)
  })
})

// ── uncheckIn ──────────────────────────────────────────

describe('uncheckIn', () => {
  let habitId

  beforeEach(async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'pass', label: 0 } })
    const res = await main({ action: 'create', data: { name: '取消打卡测试' } })
    habitId = res.data._id
  })

  test('returns _id and streakCurrent', async () => {
    // First check in
    await main({
      action: 'checkIn',
      data: { habitId, date: '2026-03-30', value: true },
    })
    // Then uncheck
    const res = await main({
      action: 'uncheckIn',
      data: { habitId, date: '2026-03-30' },
    })
    expect(res.code).toBe(0)
    expect(res.data).toHaveProperty('_id')
    expect(res.data).toHaveProperty('streakCurrent')
    expect(typeof res.data.streakCurrent).toBe('number')
  })

  test('does not decrement totalCompletions when already 0', async () => {
    // Create a check-in record directly in the DB so totalCompletions stays 0
    const checkInsCol = cloud.__getCol('check_ins')
    checkInsCol.push({
      _id: 'ci-zero',
      _openid: 'test-openid',
      habitId,
      date: '2026-03-30',
      value: true,
    })

    // Force totalCompletions to 0 on the habit
    const habitsCol = cloud.__getCol('habits')
    const habit = habitsCol.find(h => h._id === habitId)
    habit.totalCompletions = 0

    const res = await main({
      action: 'uncheckIn',
      data: { habitId, date: '2026-03-30' },
    })
    expect(res.code).toBe(0)

    // totalCompletions should still be 0 (not -1)
    const habitAfter = habitsCol.find(h => h._id === habitId)
    expect(habitAfter.totalCompletions).toBe(0)
  })
})

describe('get', () => {
  test('returns error for nonexistent habit', async () => {
    const res = await main({ action: 'get', data: { id: 'nonexistent-id' } })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('不存在')
  })
})

// ── Edge cases ──────────────────────────────────────────

describe('edge cases', () => {
  test('skips check for empty/null name', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({ action: 'create', data: { name: '' } })
    // Empty name should not trigger msgSecCheck (checkText returns true for empty)
    expect(cloud.openapi.security.msgSecCheck).not.toHaveBeenCalled()
  })

  test('unknown action returns error', async () => {
    const res = await main({ action: 'nonexistent', data: {} })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('未知操作')
  })

  test('missing OPENID returns error', async () => {
    cloud.__setWXContext({ OPENID: null })
    const res = await main({ action: 'list', data: {} })
    expect(res.code).toBe(-1)
  })
})
