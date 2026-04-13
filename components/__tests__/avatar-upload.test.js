describe('uploadAvatarToCloud guards', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    delete global.wx
    jest.clearAllMocks()
  })

  test('rejects immediately when login session is missing', async () => {
    jest.doMock('@/stores/user', () => ({
      useUserStore: () => ({ userInfo: null }),
    }))

    const { uploadAvatarToCloud } = require('@/composables/useAvatarUpload')

    await expect(uploadAvatarToCloud('/tmp/avatar.jpg')).rejects.toMatchObject({
      name: 'CloudError',
      code: -4,
    })
  })
})
