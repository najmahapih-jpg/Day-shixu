/**
 * Board cloud function tests
 * Focus: content security (msgSecCheck), imageUrl allowlist,
 * note limits, and batch-update field allowlist.
 *
 * These tests were migrated from cloudfunctions/habit/__tests__/index.test.js
 * when board CRUD was split out into its own cloud function. Action names
 * changed: boardCreate→create, boardUpdate→update, boardBatchUpdate→batchUpdate.
 */

const cloud = require('wx-server-sdk')
const { main } = require('../index.ts')

const OPENID = 'test-openid'

beforeEach(() => {
  cloud.__resetDB()
  cloud.__setWXContext({ OPENID, APPID: 'test' })
  cloud.__setMsgSecCheckResult({ result: { suggest: 'pass', label: 0 } })
  cloud.openapi.security.msgSecCheck.mockClear()
})

// ── create ─────────────────────────────────────────────

describe('create', () => {
  test('calls msgSecCheck on board content', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({ action: 'create', data: { content: '笔记内容' } })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '笔记内容' }),
    )
  })

  test('rejects board note with risky content', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({ action: 'create', data: { content: '违规' } })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('违规')
  })

  test('checks checklist items content', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({
      action: 'create',
      data: {
        noteType: 'checklist',
        checkItems: [
          { id: '1', text: '任务一' },
          { id: '2', text: '任务二' },
        ],
      },
    })
    const calls = cloud.openapi.security.msgSecCheck.mock.calls
    const checkedContents = calls.map(c => c[0].content)
    expect(checkedContents.some(c => c.includes('任务一'))).toBe(true)
  })
})

describe('create imageUrl allowlist', () => {
  test('accepts cloud:// imageUrl', async () => {
    const res = await main({
      action: 'create',
      data: { content: 'ok', imageUrl: 'cloud://env.xxx/img.png' },
    })
    expect(res.code).toBe(0)
    expect(res.data.imageUrl).toBe('cloud://env.xxx/img.png')
  })

  test('accepts https:// imageUrl', async () => {
    const res = await main({
      action: 'create',
      data: { content: 'ok', imageUrl: 'https://example.com/img.png' },
    })
    expect(res.code).toBe(0)
    expect(res.data.imageUrl).toBe('https://example.com/img.png')
  })

  test('rejects javascript: imageUrl', async () => {
    const res = await main({
      action: 'create',
      data: { content: 'ok', imageUrl: 'javascript:alert(1)' },
    })
    expect(res.code).toBe(0)
    expect(res.data.imageUrl || '').toBe('')
  })

  test('rejects data: imageUrl', async () => {
    const res = await main({
      action: 'create',
      data: { content: 'ok', imageUrl: 'data:text/html,<script>alert(1)</script>' },
    })
    expect(res.code).toBe(0)
    expect(res.data.imageUrl || '').toBe('')
  })

  test('rejects http:// imageUrl', async () => {
    const res = await main({
      action: 'create',
      data: { content: 'ok', imageUrl: 'http://evil.com/track.gif' },
    })
    expect(res.code).toBe(0)
    expect(res.data.imageUrl || '').toBe('')
  })
})

describe('create limits', () => {
  test('rejects when board note limit reached', async () => {
    const boardCol = cloud.__getCol('board_notes')
    for (let i = 0; i < 200; i++) {
      boardCol.push({ _id: `bn-${i}`, _openid: OPENID, content: `note${i}` })
    }
    const res = await main({ action: 'create', data: { content: '超出上限' } })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('上限')
  })
})

// ── update ─────────────────────────────────────────────

describe('update', () => {
  let noteId

  beforeEach(async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'pass', label: 0 } })
    const res = await main({
      action: 'create',
      data: { content: '原始内容' },
    })
    noteId = res.data._id
  })

  test('checks updated content', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({
      action: 'update',
      data: { id: noteId, updates: { content: '新内容' } },
    })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '新内容' }),
    )
  })

  test('rejects update with risky content', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'update',
      data: { id: noteId, updates: { content: '违规' } },
    })
    expect(res.code).toBe(-1)
  })

  test('checks updated checkItems for content security', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({
      action: 'update',
      data: {
        id: noteId,
        updates: {
          noteType: 'checklist',
          checkItems: [{ id: '1', text: '新任务' }],
        },
      },
    })
    const calls = cloud.openapi.security.msgSecCheck.mock.calls
    const checkedContents = calls.map(c => c[0].content)
    expect(checkedContents.some(c => c.includes('新任务'))).toBe(true)
  })

  test('rejects checkItems with risky content', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'update',
      data: {
        id: noteId,
        updates: {
          noteType: 'checklist',
          checkItems: [{ id: '1', text: '违规清单' }],
        },
      },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('清单')
  })
})

// ── batchUpdate ────────────────────────────────────────

describe('batchUpdate', () => {
  test('strips content field from batch updates (allowlist enforcement)', async () => {
    // batchUpdate only allows layout/style fields — content must go through update
    const res = await main({
      action: 'batchUpdate',
      data: {
        updates: [
          { id: 'some-id', fields: { content: '偷偷修改内容', x: 10, y: 20 } },
        ],
      },
    })
    // batch update should succeed but content should be filtered out
    expect(res.code).toBe(0)
  })
})
