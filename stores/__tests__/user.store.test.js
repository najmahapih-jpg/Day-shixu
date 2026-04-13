function buildUni() {
  return {
    showToast: jest.fn(),
  }
}

function buildUser(id) {
  return {
    _id: id,
    _openid: `${id}-openid`,
    nickName: '',
    avatarUrl: '',
    settings: { theme: 'neo', reduceMotion: false, weekStartsOn: 1, notifyEnabled: true },
    stats: { joinDate: '2026-04-01', totalCheckIns: 0, currentStreak: 0, longestStreak: 0 },
    profileMeta: { wechatAuthorized: false, wechatSyncAt: null },
  }
}

function loadUserStore(mocks) {
  jest.resetModules()
  jest.doMock('@/services/userService', () => mocks.userService)
  jest.doMock('@/utils/cache', () => ({
    clearCache: jest.fn(),
  }))

  const { useUserStore } = require('@/stores/user')
  return useUserStore()
}

describe('useUserStore ensureLoggedIn', () => {
  let mockUni
  let mocks
  let store

  beforeEach(() => {
    mockUni = buildUni()
    global.uni = mockUni
    mocks = {
      userService: {
        login: jest.fn(),
        getProfile: jest.fn(),
        updateSettings: jest.fn(),
        syncWechatProfile: jest.fn(),
      },
    }
    store = loadUserStore(mocks)
  })

  afterEach(() => {
    delete global.uni
    jest.clearAllMocks()
  })

  test('dedupes concurrent ensureLoggedIn calls through a shared promise', async () => {
    let resolveLogin
    mocks.userService.login.mockImplementation(
      () => new Promise((resolve) => { resolveLogin = resolve }),
    )

    const first = store.ensureLoggedIn()
    const second = store.ensureLoggedIn()

    expect(store.loginPhase).toBe('loading')
    expect(mocks.userService.login).toHaveBeenCalledTimes(1)

    resolveLogin(buildUser('user-1'))

    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(true)
    expect(store.loginPhase).toBe('ready')
    expect(store.isLoggedIn).toBe(true)
  })

  test('retries after a failed login only when retry is enabled', async () => {
    mocks.userService.login
      .mockRejectedValueOnce(new Error('login failed'))
      .mockResolvedValueOnce(buildUser('user-2'))

    await expect(store.ensureLoggedIn({ silent: true })).resolves.toBe(false)
    expect(store.loginPhase).toBe('error')

    await expect(store.ensureLoggedIn({ silent: true })).resolves.toBe(false)
    expect(mocks.userService.login).toHaveBeenCalledTimes(1)

    await expect(store.ensureLoggedIn({ retry: true, silent: true })).resolves.toBe(true)
    expect(mocks.userService.login).toHaveBeenCalledTimes(2)
    expect(store.loginPhase).toBe('ready')
  })
})
