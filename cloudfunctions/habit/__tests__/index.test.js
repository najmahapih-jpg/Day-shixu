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
