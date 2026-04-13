const { ref } = require('vue')

describe('callCloud session classification', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.doMock('@/composables/useNetwork', () => ({
      useNetwork: () => ({ isConnected: ref(true) }),
    }))
    jest.doMock('@/utils/cloudEnv', () => ({
      CLOUD_ENV_ID: 'cloud-dev-01-2gvgeewv8b7147fb',
    }))
  })

  afterEach(() => {
    delete global.wx
    jest.clearAllMocks()
  })

  test('maps 未获取到用户身份 to auth/session CloudError', async () => {
    global.wx = {
      cloud: {
        callFunction: jest.fn().mockResolvedValue({
          result: { code: -1, message: '未获取到用户身份' },
        }),
      },
    }

    const { callCloud } = require('@/services/cloud')

    await expect(callCloud('user', 'login')).rejects.toMatchObject({
      name: 'CloudError',
      code: -4,
    })
    await expect(callCloud('user', 'login')).rejects.toThrow('登录状态失效')
  })
})
