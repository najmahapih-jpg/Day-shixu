/**
 * Notify cloud function tests
 * Focus: trigger-metadata validation, notifyEnabled enforcement,
 *        multi-page user pagination, DB error handling.
 */
const fs = require('fs')
const path = require('path')
const cloud = require('wx-server-sdk')
const { main } = require('../index')

const runtimeConfigLocalPath = path.join(__dirname, '..', 'runtime-config.local.json')
let originalRuntimeConfigLocalContent = null
let hadOriginalRuntimeConfigLocal = false

// Compute the current HH:mm string the same way the scheduler does
function currentHHmm() {
  const now = new Date()
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000)
  const h = String(utc8.getUTCHours()).padStart(2, '0')
  const m = String(utc8.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// Timer trigger event shape (WeChat cloud timer injects event.Type='Timer')
const TIMER_EVENT = { Type: 'Timer', action: 'scheduledRemind' }

beforeEach(() => {
  hadOriginalRuntimeConfigLocal = fs.existsSync(runtimeConfigLocalPath)
  originalRuntimeConfigLocalContent = hadOriginalRuntimeConfigLocal
    ? fs.readFileSync(runtimeConfigLocalPath, 'utf8')
    : null
  cloud.__resetDB()
  cloud.__setWXContext({ OPENID: '', APPID: 'test' })
  cloud.__clearNextGetError()
  cloud.openapi.subscribeMessage.send.mockClear()
  cloud.openapi.subscribeMessage.send.mockImplementation(() => Promise.resolve({ errCode: 0 }))
  fs.writeFileSync(runtimeConfigLocalPath, JSON.stringify({ subscribeTemplateId: 'test-template-id' }), 'utf8')
})

afterEach(() => {
  if (hadOriginalRuntimeConfigLocal) {
    fs.writeFileSync(runtimeConfigLocalPath, originalRuntimeConfigLocalContent, 'utf8')
  } else if (fs.existsSync(runtimeConfigLocalPath)) {
    fs.unlinkSync(runtimeConfigLocalPath)
  }
})

describe('notify trigger-metadata validation', () => {
  test('rejects direct client invocation (OPENID present)', async () => {
    cloud.__setWXContext({ OPENID: 'some-user', APPID: 'test' })
    const res = await main(TIMER_EVENT, {})
    expect(res.code).toBe(-1)
    expect(res.message).toContain('不支持直接调用')
  })

  test('rejects missing Timer type metadata', async () => {
    // No OPENID (scheduler-style), but event.Type is absent
    const res = await main({ action: 'scheduledRemind' }, {})
    expect(res.code).toBe(-1)
    expect(res.message).toContain('定时触发器')
  })

  test('rejects wrong Type metadata', async () => {
    const res = await main({ Type: 'Http', action: 'scheduledRemind' }, {})
    expect(res.code).toBe(-1)
    expect(res.message).toContain('定时触发器')
  })

  test('accepts Timer-triggered invocation with no OPENID', async () => {
    const res = await main(TIMER_EVENT, {})
    expect(res.code).toBe(0)
    expect(res.data).toEqual({ sent: 0, total: 0 })
  })

  test('rejects unknown action even on Timer trigger', async () => {
    const res = await main({ Type: 'Timer', action: 'nonexistent' }, {})
    expect(res.code).toBe(-1)
    expect(res.message).toContain('未知操作')
  })
})

describe('notify notifyEnabled enforcement', () => {
  test('does NOT send to users with notifyEnabled=false', async () => {
    const time = currentHHmm()
    cloud.__getCol('habits').push({
      _id: 'h-disabled',
      _openid: 'user-disabled',
      name: '早起',
      frequency: 'daily',
      isArchived: false,
      reminderTime: time,
    })
    cloud.__getCol('users').push({
      _id: 'u-disabled',
      _openid: 'user-disabled',
      settings: { notifyEnabled: false },
    })

    const res = await main(TIMER_EVENT, {})
    expect(res.code).toBe(0)
    expect(res.data.sent).toBe(0)
    expect(cloud.openapi.subscribeMessage.send).not.toHaveBeenCalled()
  })

  test('sends to users with notifyEnabled=true or undefined', async () => {
    const time = currentHHmm()
    cloud.__getCol('habits').push({
      _id: 'h-enabled',
      _openid: 'user-enabled',
      name: '阅读',
      frequency: 'daily',
      isArchived: false,
      reminderTime: time,
    })
    // settings absent → treat as enabled
    cloud.__getCol('users').push({ _id: 'u-enabled', _openid: 'user-enabled' })

    const res = await main(TIMER_EVENT, {})
    expect(res.code).toBe(0)
    expect(res.data.sent).toBe(1)
    expect(cloud.openapi.subscribeMessage.send).toHaveBeenCalledTimes(1)
    expect(cloud.openapi.subscribeMessage.send).toHaveBeenCalledWith(
      expect.objectContaining({ touser: 'user-enabled' }),
    )
  })
})

describe('notify multi-page user pagination', () => {
  test('reaches all users even when >100 habits match the reminder window', async () => {
    const time = currentHHmm()
    const habitsCol = cloud.__getCol('habits')
    const usersCol = cloud.__getCol('users')
    const USER_COUNT = 150
    for (let i = 0; i < USER_COUNT; i++) {
      const openid = `user-${i}`
      habitsCol.push({
        _id: `h-${i}`,
        _openid: openid,
        name: `habit-${i}`,
        frequency: 'daily',
        isArchived: false,
        reminderTime: time,
      })
      usersCol.push({ _id: `u-${i}`, _openid: openid })
    }

    const res = await main(TIMER_EVENT, {})
    expect(res.code).toBe(0)
    expect(res.data.total).toBe(USER_COUNT)
    expect(res.data.sent).toBe(USER_COUNT)
    expect(cloud.openapi.subscribeMessage.send).toHaveBeenCalledTimes(USER_COUNT)
  })
})

describe('notify graceful error handling', () => {
  test('returns generic fail (not crash) when habit query rejects', async () => {
    cloud.__failNextGet('simulated DB outage')
    const res = await main(TIMER_EVENT, {})
    expect(res.code).toBe(-1)
    expect(res.message).toContain('服务器错误')
  })

  test('continues when subscribeMessage.send throws 43101 (user not subscribed)', async () => {
    const time = currentHHmm()
    cloud.__getCol('habits').push({
      _id: 'h-unsub',
      _openid: 'user-unsub',
      name: '跑步',
      frequency: 'daily',
      isArchived: false,
      reminderTime: time,
    })
    cloud.__getCol('users').push({ _id: 'u-unsub', _openid: 'user-unsub' })

    cloud.openapi.subscribeMessage.send.mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error('user not subscribed'), { errCode: 43101 })),
    )

    const res = await main(TIMER_EVENT, {})
    // 43101 is silently skipped; function still returns ok
    expect(res.code).toBe(0)
    expect(res.data.sent).toBe(0)
    expect(res.data.total).toBe(1)
  })

  test('continues when subscribeMessage.send throws non-43101 error', async () => {
    const time = currentHHmm()
    cloud.__getCol('habits').push({
      _id: 'h-err',
      _openid: 'user-err',
      name: '冥想',
      frequency: 'daily',
      isArchived: false,
      reminderTime: time,
    })
    cloud.__getCol('users').push({ _id: 'u-err', _openid: 'user-err' })

    cloud.openapi.subscribeMessage.send.mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error('rate limit'), { errCode: 45009 })),
    )

    const res = await main(TIMER_EVENT, {})
    expect(res.code).toBe(0)
    expect(res.data.sent).toBe(0)
    expect(res.data.total).toBe(1)
  })
})
