/**
 * User cloud function tests
 * Focus: content security for nickname, login defaults, profile sync
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

// ── Login ───────────────────────────────────────────────

describe('login', () => {
  test('creates new user with correct defaults', async () => {
    const res = await main({ action: 'login' })
    expect(res.code).toBe(0)
    expect(res.data.nickName).toBe('用户')
    expect(res.data.settings.theme).toBe('neo')
    expect(res.data.settings.notifyEnabled).toBe(true)
    expect(res.data.profileMeta).toBeDefined()
    expect(res.data.profileMeta.source).toBe('manual')
  })

  test('returns existing user on subsequent login', async () => {
    await main({ action: 'login' })
    const res = await main({ action: 'login' })
    expect(res.code).toBe(0)
    expect(res.data.nickName).toBe('用户')
  })

  test('backfills profileMeta for legacy user without it', async () => {
    // Simulate a legacy user without profileMeta
    const col = cloud.__getCol('users')
    col.push({
      _id: 'legacy-user',
      _openid: OPENID,
      nickName: 'OldUser',
      avatarUrl: '',
      settings: { theme: 'neo' },
    })
    const res = await main({ action: 'login' })
    expect(res.code).toBe(0)
    expect(res.data.profileMeta).toBeDefined()
    expect(res.data.profileMeta.source).toBe('manual')
  })
})

// ── updateProfile ───────────────────────────────────────

describe('updateProfile', () => {
  beforeEach(async () => {
    await main({ action: 'login' })
  })

  test('checks nickname in profile update', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({
      action: 'updateProfile',
      data: { nickName: '微信昵称', source: 'wechat' },
    })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '微信昵称', scene: 1 }),
    )
  })

  test('rejects profile update with risky nickname', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'updateProfile',
      data: { nickName: '违规', source: 'wechat' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('违规')
  })

  test('updates profileMeta with wechat source', async () => {
    const res = await main({
      action: 'updateProfile',
      data: {
        nickName: 'WeChat用户',
        avatarUrl: 'https://example.com/avatar.jpg',
        source: 'wechat',
      },
    })
    expect(res.code).toBe(0)
    expect(res.data.profileMeta.source).toBe('wechat')
    expect(res.data.profileMeta.wechatAuthorized).toBe(true)
    expect(res.data.profileMeta.wechatSyncAt).toBeTruthy()
  })

  test('updates profileMeta with manual source', async () => {
    const res = await main({
      action: 'updateProfile',
      data: { nickName: '手动昵称', source: 'manual' },
    })
    expect(res.code).toBe(0)
    expect(res.data.profileMeta.source).toBe('manual')
    expect(res.data.profileMeta.manualEditAt).toBeTruthy()
  })
})

// ── Edge cases ──────────────────────────────────────────

describe('edge cases', () => {
  test('missing OPENID returns error', async () => {
    cloud.__setWXContext({ OPENID: null })
    const res = await main({ action: 'login' })
    expect(res.code).toBe(-1)
  })

  test('unknown action returns error', async () => {
    const res = await main({ action: 'nonexistent' })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('未知操作')
  })
})
