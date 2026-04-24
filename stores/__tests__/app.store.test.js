const { createPinia } = require('pinia')

function buildUni() {
  return {
    getWindowInfo: jest.fn(() => ({ statusBarHeight: 24 })),
    getDeviceInfo: jest.fn(() => ({ platform: 'devtools' })),
    getStorageSync: jest.fn(),
    setStorageSync: jest.fn(),
  }
}

function buildWx() {
  return {
    getStorageSync: jest.fn(),
    setStorageSync: jest.fn(),
  }
}

function loadStore() {
  jest.resetModules()
  const { useAppStore } = require('@/stores/app')
  return useAppStore(createPinia())
}

describe('useAppStore first-visit state', () => {
  let mockUni
  let mockWx

  beforeEach(() => {
    mockUni = buildUni()
    mockWx = buildWx()
    global.uni = mockUni
    global.wx = mockWx
  })

  afterEach(() => {
    delete global.uni
    delete global.wx
    jest.clearAllMocks()
  })

  test('treats an empty v_1_0_visited flag as first visit', () => {
    mockWx.getStorageSync.mockReturnValue('')

    const store = loadStore()

    expect(store.checkFirstVisit()).toBe(true)
    expect(store.isFirstVisit).toBe(true)
    expect(store.hasCheckedFirstVisit).toBe(true)
    expect(mockWx.getStorageSync).toHaveBeenCalledWith('v_1_0_visited')
  })

  test('treats persisted v_1_0_visited flag as a returning visit', () => {
    mockWx.getStorageSync.mockReturnValue('1')

    const store = loadStore()

    expect(store.checkFirstVisit()).toBe(false)
    expect(store.isFirstVisit).toBe(false)
    expect(store.hasCheckedFirstVisit).toBe(true)
  })

  test('marks the first visit as seen through storage and local state', () => {
    const store = loadStore()

    store.markFirstVisitSeen()

    expect(store.isFirstVisit).toBe(false)
    expect(store.hasCheckedFirstVisit).toBe(true)
    expect(mockWx.setStorageSync).toHaveBeenCalledWith('v_1_0_visited', '1')
  })
})
