/**
 * User cloud function tests
 * Focus: login defaults, metadata migration, and WeChat profile sync
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

describe('login', () => {
  test('creates new user with default WeChat sync metadata', async () => {
    const res = await main({ action: 'login' })

    expect(res.code).toBe(0)
    expect(res.data.nickName).toBe('')
    expect(res.data.avatarUrl).toBe('')
    expect(res.data.settings.theme).toBe('neo')
    expect(res.data.settings.notifyEnabled).toBe(true)
    expect(res.data.profileMeta).toEqual({
      wechatAuthorized: false,
      wechatSyncAt: null,
    })
  })

  test('normalizes legacy manual metadata as not synced', async () => {
    const col = cloud.__getCol('users')
    col.push({
      _id: 'legacy-manual',
      _openid: OPENID,
      nickName: '用户',
      avatarUrl: 'cloud://legacy/avatar.jpg',
      settings: { theme: 'neo' },
      profileMeta: {
        source: 'manual',
        firstLoginPromptDismissed: true,
        manualEditAt: '2025-01-01T00:00:00.000Z',
        wechatAuthorized: false,
        wechatSyncAt: null,
      },
    })

    const res = await main({ action: 'login' })

    expect(res.code).toBe(0)
    expect(res.data.profileMeta).toEqual({
      wechatAuthorized: false,
      wechatSyncAt: null,
    })
  })

  test('normalizes legacy wechat metadata as already synced', async () => {
    const col = cloud.__getCol('users')
    col.push({
      _id: 'legacy-wechat',
      _openid: OPENID,
      nickName: '真实昵称',
      avatarUrl: 'cloud://legacy/avatar.jpg',
      settings: { theme: 'neo' },
      profileMeta: {
        source: 'wechat',
        wechatAuthorized: false,
        wechatSyncAt: null,
      },
    })

    const res = await main({ action: 'login' })

    expect(res.code).toBe(0)
    expect(res.data.profileMeta.wechatAuthorized).toBe(true)
    expect(res.data.profileMeta.wechatSyncAt).toBeTruthy()
  })

  test('treats legacy placeholder nicknames as not synced', async () => {
    const col = cloud.__getCol('users')
    col.push({
      _id: 'placeholder-nick',
      _openid: OPENID,
      nickName: '微信用户',
      avatarUrl: '',
      settings: { theme: 'neo' },
      profileMeta: {
        source: 'wechat',
        wechatAuthorized: false,
        wechatSyncAt: null,
      },
    })

    const res = await main({ action: 'login' })

    expect(res.code).toBe(0)
    expect(res.data.profileMeta.wechatAuthorized).toBe(false)
  })

  test('backfills missing metadata for legacy user', async () => {
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
    expect(res.data.profileMeta).toEqual({
      wechatAuthorized: false,
      wechatSyncAt: null,
    })
  })
})

describe('syncWechatProfile', () => {
  beforeEach(async () => {
    await main({ action: 'login' })
  })

  test('checks nickname content security during sync', async () => {
    await main({
      action: 'syncWechatProfile',
      data: { nickName: '微信昵称' },
    })

    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '微信昵称', scene: 1 }),
    )
  })

  test('syncs nickname only', async () => {
    const res = await main({
      action: 'syncWechatProfile',
      data: { nickName: '微信昵称' },
    })

    expect(res.code).toBe(0)
    expect(res.data.nickName).toBe('微信昵称')
    expect(res.data.profileMeta.wechatAuthorized).toBe(false)
    expect(res.data.profileMeta.wechatSyncAt).toBeNull()
  })

  test('syncs avatar only', async () => {
    const res = await main({
      action: 'syncWechatProfile',
      data: { avatarUrl: 'cloud://test-bucket/avatar.jpg' },
    })

    expect(res.code).toBe(0)
    expect(res.data.avatarUrl).toBe('cloud://test-bucket/avatar.jpg')
    expect(res.data.profileMeta.wechatAuthorized).toBe(true)
  })

  test('keeps avatar authorization when updating nickname after avatar sync', async () => {
    await main({
      action: 'syncWechatProfile',
      data: { avatarUrl: 'cloud://test-bucket/avatar.jpg' },
    })

    const res = await main({
      action: 'syncWechatProfile',
      data: { nickName: 'ManualNick' },
    })

    expect(res.code).toBe(0)
    expect(res.data.nickName).toBe('ManualNick')
    expect(res.data.avatarUrl).toBe('cloud://test-bucket/avatar.jpg')
    expect(res.data.profileMeta.wechatAuthorized).toBe(true)
    expect(res.data.profileMeta.wechatSyncAt).toBeTruthy()
  })

  test('rejects risky nickname and leaves metadata unchanged', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })

    const res = await main({
      action: 'syncWechatProfile',
      data: { nickName: '违规' },
    })

    expect(res.code).toBe(-1)
    expect(res.message).toContain('违规')

    const profileRes = await main({ action: 'getProfile' })
    expect(profileRes.data.profileMeta).toEqual({
      wechatAuthorized: false,
      wechatSyncAt: null,
    })
  })

  test('rejects invalid avatar URL and leaves metadata unchanged', async () => {
    const res = await main({
      action: 'syncWechatProfile',
      data: { avatarUrl: 'javascript:alert(1)' },
    })

    expect(res.code).toBe(-1)
    expect(res.message).toContain('头像地址')

    const profileRes = await main({ action: 'getProfile' })
    expect(profileRes.data.profileMeta).toEqual({
      wechatAuthorized: false,
      wechatSyncAt: null,
    })
  })

  test('ignores blank nickname when avatar exists', async () => {
    const res = await main({
      action: 'syncWechatProfile',
      data: {
        nickName: '   ',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    })

    expect(res.code).toBe(0)
    expect(res.data.nickName).toBe('')
    expect(res.data.avatarUrl).toBe('https://example.com/avatar.jpg')
    expect(res.data.profileMeta.wechatAuthorized).toBe(true)
  })

  test('fails when neither nickname nor avatar is valid', async () => {
    const res = await main({
      action: 'syncWechatProfile',
      data: { nickName: '   ', avatarUrl: '   ' },
    })

    expect(res.code).toBe(-1)
    expect(res.message).toContain('没有可保存的头像或昵称')
  })
})

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
