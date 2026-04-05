/**
 * Ritual cloud function tests
 * Focus: content security, CRUD, execute
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

// ── Create ──────────────────────────────────────────────

describe('ritual create', () => {
  test('creates ritual with valid name', async () => {
    const res = await main({
      action: 'create',
      ritual: { name: '晨间仪式', type: 'morning', habitIds: [] },
    })
    expect(res.code).toBe(0)
    expect(res.data.name).toBe('晨间仪式')
  })

  test('calls msgSecCheck on ritual name', async () => {
    await main({
      action: 'create',
      ritual: { name: '测试仪式' },
    })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '测试仪式', version: 2 }),
    )
  })

  test('rejects risky ritual name', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'create',
      ritual: { name: '违规仪式名' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('违规')
  })

  test('rejects missing name', async () => {
    const res = await main({
      action: 'create',
      ritual: { type: 'morning' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('名称必填')
  })

  test('rejects name exceeding max length', async () => {
    const res = await main({
      action: 'create',
      ritual: { name: 'x'.repeat(101) },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('100')
  })

  test('rejects description exceeding max length', async () => {
    const res = await main({
      action: 'create',
      ritual: { name: 'ok', description: 'x'.repeat(501) },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('500')
  })
})

// ── Update ──────────────────────────────────────────────

describe('ritual update', () => {
  let ritualId

  beforeEach(async () => {
    const res = await main({
      action: 'create',
      ritual: { name: '原始仪式', type: 'morning', habitIds: [] },
    })
    ritualId = res.data._id
  })

  test('checks updated name', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    await main({
      action: 'update',
      id: ritualId,
      ritual: { name: '新名称' },
    })
    expect(cloud.openapi.security.msgSecCheck).toHaveBeenCalledWith(
      expect.objectContaining({ content: '新名称' }),
    )
  })

  test('rejects risky updated name', async () => {
    cloud.__setMsgSecCheckResult({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'update',
      id: ritualId,
      ritual: { name: '违规' },
    })
    expect(res.code).toBe(-1)
  })

  test('allows update without name change', async () => {
    cloud.openapi.security.msgSecCheck.mockClear()
    const res = await main({
      action: 'update',
      id: ritualId,
      ritual: { type: 'evening' },
    })
    expect(res.code).toBe(0)
    // No name provided, so no msgSecCheck call
    expect(cloud.openapi.security.msgSecCheck).not.toHaveBeenCalled()
  })
})

// ── Delete ──────────────────────────────────────────────

describe('ritual delete', () => {
  test('deletes own ritual', async () => {
    const createRes = await main({
      action: 'create',
      ritual: { name: '删除测试', habitIds: [] },
    })
    const res = await main({ action: 'delete', id: createRes.data._id })
    expect(res.code).toBe(0)
  })

  test('rejects deleting other user ritual', async () => {
    // Insert a ritual owned by another user
    const col = cloud.__getCol('rituals')
    col.push({ _id: 'other-ritual', _openid: 'other-user', name: 'Other' })
    const res = await main({ action: 'delete', id: 'other-ritual' })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('无权')
  })
})

// ── Execute ─────────────────────────────────────────────

describe('ritual execute', () => {
  let ritualId, habitId

  beforeEach(async () => {
    // Create a habit
    const habitsCol = cloud.__getCol('habits')
    habitId = 'test-habit-1'
    habitsCol.push({
      _id: habitId,
      _openid: OPENID,
      name: '跑步',
      isArchived: false,
      streakCurrent: 0,
      streakLongest: 0,
      totalCompletions: 0,
    })

    // Create a ritual linked to the habit
    const res = await main({
      action: 'create',
      ritual: { name: '晨跑仪式', type: 'morning', habitIds: [habitId] },
    })
    ritualId = res.data._id
  })

  test('executes ritual and creates check-ins', async () => {
    const res = await main({
      action: 'execute',
      ritualId,
      completedHabitIds: [habitId],
      date: '2026-03-25',
    })
    expect(res.code).toBe(0)
    expect(res.data.checkIns.length).toBe(1)
    expect(res.data.date).toBe('2026-03-25')
  })

  test('rejects execute with empty habitIds', async () => {
    const res = await main({
      action: 'execute',
      ritualId,
      completedHabitIds: [],
    })
    expect(res.code).toBe(-1)
  })

  test('rejects execute with too many habits', async () => {
    const manyIds = Array.from({ length: 101 }, (_, i) => `h${i}`)
    const res = await main({
      action: 'execute',
      ritualId,
      completedHabitIds: manyIds,
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('过多')
  })
})

// ── Description content security ───────────────────────

describe('ritual description content security', () => {
  test('rejects risky description on create', async () => {
    // First call (name) passes, second call (description) fails
    cloud.openapi.security.msgSecCheck
      .mockResolvedValueOnce({ result: { suggest: 'pass', label: 0 } })
      .mockResolvedValueOnce({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'create',
      ritual: { name: '正常名称', description: '违规描述' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('描述')
  })

  test('rejects risky description on update', async () => {
    const createRes = await main({
      action: 'create',
      ritual: { name: '测试仪式', habitIds: [] },
    })
    // Name passes, description fails
    cloud.openapi.security.msgSecCheck
      .mockResolvedValueOnce({ result: { suggest: 'pass', label: 0 } })
      .mockResolvedValueOnce({ result: { suggest: 'risky', label: 100 } })
    const res = await main({
      action: 'update',
      id: createRes.data._id,
      ritual: { name: '新名称', description: '违规描述' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('描述')
  })
})

describe('ritual update nonexistent', () => {
  test('returns error for nonexistent ritual', async () => {
    const res = await main({
      action: 'update',
      id: 'nonexistent-id',
      ritual: { name: '新名称' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('不存在')
  })
})

describe('ritual execute frequency-aware streak', () => {
  test('weekdays-only habit streak crosses weekend in ritual execute', async () => {
    const habitsCol = cloud.__getCol('habits')
    habitsCol.push({
      _id: 'wd-habit',
      _openid: OPENID,
      name: '工作日习惯',
      frequency: 'weekdays',
      isArchived: false,
      streakCurrent: 0,
      streakLongest: 0,
      totalCompletions: 0,
    })

    const ritualsCol = cloud.__getCol('rituals')
    ritualsCol.push({
      _id: 'wd-ritual',
      _openid: OPENID,
      name: '工作日仪式',
      habitIds: ['wd-habit'],
    })

    // Check-ins for Mon-Fri of previous week
    const checkInsCol = cloud.__getCol('check_ins')
    const days = ['2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27']
    days.forEach((d, i) => {
      checkInsCol.push({ _id: `ci-wd-${i}`, _openid: OPENID, habitId: 'wd-habit', date: d, value: true, createdAt: d })
    })

    // Execute ritual on Monday 2026-03-30
    const res = await main({
      action: 'execute',
      ritualId: 'wd-ritual',
      completedHabitIds: ['wd-habit'],
      date: '2026-03-30',
    })
    expect(res.code).toBe(0)

    const habit = habitsCol.find(h => h._id === 'wd-habit')
    // Streak should be 6 (5 prev weekdays + today), not 1
    expect(habit.streakCurrent).toBe(6)
  })
})

describe('ritual execute streak with freeze records', () => {
  let ritualId, habitId

  beforeEach(async () => {
    const habitsCol = cloud.__getCol('habits')
    habitId = 'streak-habit'
    habitsCol.push({
      _id: habitId,
      _openid: OPENID,
      name: '连续打卡',
      isArchived: false,
      streakCurrent: 0,
      streakLongest: 0,
      totalCompletions: 0,
    })

    const res = await main({
      action: 'create',
      ritual: { name: '连续仪式', type: 'morning', habitIds: [habitId] },
    })
    ritualId = res.data._id
  })

  test('streak calculation considers freeze records', async () => {
    const checkInsCol = cloud.__getCol('check_ins')

    // Day before yesterday: normal check-in
    checkInsCol.push({
      _id: 'ci-day-2',
      _openid: OPENID,
      habitId,
      date: '2026-03-23',
      value: true,
    })
    // Yesterday: freeze record (no habit check-in)
    checkInsCol.push({
      _id: 'freeze-day-1',
      _openid: OPENID,
      habitId: '__freeze__',
      date: '2026-03-24',
      value: 1,
      type: 'freeze',
    })

    // Execute today — should count freeze day in streak
    const res = await main({
      action: 'execute',
      ritualId,
      completedHabitIds: [habitId],
      date: '2026-03-25',
    })
    expect(res.code).toBe(0)

    // Verify streak was updated on the habit (should be >= 3: day-2 + freeze + today)
    const habitsCol = cloud.__getCol('habits')
    const habit = habitsCol.find(h => h._id === habitId)
    expect(habit.streakCurrent).toBeGreaterThanOrEqual(3)
  })
})

describe('ritual execute ownership', () => {
  test('only processes habits belonging to current user', async () => {
    // Create a habit for current user
    const habitsCol = cloud.__getCol('habits')
    habitsCol.push({
      _id: 'my-habit',
      _openid: OPENID,
      name: '我的习惯',
      isArchived: false,
      streakCurrent: 0,
      streakLongest: 0,
      totalCompletions: 0,
    })
    // Create a habit for another user
    habitsCol.push({
      _id: 'other-habit',
      _openid: 'other-user',
      name: '别人的习惯',
      isArchived: false,
      streakCurrent: 0,
      streakLongest: 0,
      totalCompletions: 0,
    })

    // Create a ritual with both habits
    const ritualsCol = cloud.__getCol('rituals')
    ritualsCol.push({
      _id: 'test-ritual',
      _openid: OPENID,
      name: '混合仪式',
      habitIds: ['my-habit', 'other-habit'],
    })

    const res = await main({
      action: 'execute',
      ritualId: 'test-ritual',
      completedHabitIds: ['my-habit', 'other-habit'],
      date: '2026-03-30',
    })

    expect(res.code).toBe(0)
    // Only my-habit should be checked in (other-habit belongs to different user)
    expect(res.data.checkIns.length).toBe(1)
    expect(res.data.checkIns[0].habitId).toBe('my-habit')
  })
})

// ── Limits ─────────────────────────────────────────────

describe('ritual limits', () => {
  test('rejects creation when ritual limit reached', async () => {
    const col = cloud.__getCol('rituals')
    for (let i = 0; i < 50; i++) {
      col.push({ _id: `r-${i}`, _openid: OPENID, name: `仪式${i}` })
    }
    const res = await main({
      action: 'create',
      ritual: { name: '超出上限', habitIds: [] },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('上限')
  })
})

describe('ritual get/remove nonexistent', () => {
  test('get returns friendly error for nonexistent ritual', async () => {
    const res = await main({ action: 'get', id: 'nonexistent-id' })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('不存在')
  })

  test('remove returns friendly error for nonexistent ritual', async () => {
    const res = await main({ action: 'delete', id: 'nonexistent-id' })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('不存在')
  })
})

// ── Edge cases ──────────────────────────────────────────

describe('edge cases', () => {
  test('missing OPENID returns error', async () => {
    cloud.__setWXContext({ OPENID: null })
    const res = await main({ action: 'list' })
    expect(res.code).toBe(-1)
  })
})

// ── Cross-user authorization (F5) ──────────────────────
// Attacker cannot mutate a ritual that belongs to another user.
describe('cross-user authorization — ritual mutations', () => {
  const VICTIM = 'victim-openid'
  const ATTACKER = 'attacker-openid'

  function seedVictimRitual(overrides = {}) {
    cloud.__getCol('rituals').push({
      _id: 'victim-ritual',
      _openid: VICTIM,
      name: 'victim ritual',
      type: 'morning',
      habitIds: ['victim-habit-1'],
      ...overrides,
    })
  }

  beforeEach(() => {
    cloud.__setWXContext({ OPENID: ATTACKER, APPID: 'test' })
  })

  test('update rejects attacker and leaves name intact', async () => {
    seedVictimRitual()
    const res = await main({
      action: 'update',
      id: 'victim-ritual',
      ritual: { name: 'hijacked' },
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('无权')
    const after = cloud.__getCol('rituals').find((r) => r._id === 'victim-ritual')
    expect(after.name).toBe('victim ritual')
    expect(after._openid).toBe(VICTIM)
  })

  test('delete rejects attacker and leaves ritual intact', async () => {
    seedVictimRitual()
    const res = await main({ action: 'delete', id: 'victim-ritual' })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('无权')
    const after = cloud.__getCol('rituals').find((r) => r._id === 'victim-ritual')
    expect(after).toBeTruthy()
  })

  test('execute rejects attacker and creates no check-ins', async () => {
    seedVictimRitual()
    cloud.__getCol('habits').push({
      _id: 'victim-habit-1',
      _openid: VICTIM,
      name: 'victim habit',
      frequency: 'daily',
      isArchived: false,
    })
    const checkInsBefore = cloud.__getCol('check_ins').length
    const res = await main({
      action: 'execute',
      ritualId: 'victim-ritual',
      completedHabitIds: ['victim-habit-1'],
      date: '2026-04-05',
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('无权')
    expect(cloud.__getCol('check_ins').length).toBe(checkInsBefore)
  })
})

// ── execute hardening: dup-key retry, archived-habit skip, partial failure
describe('ritual execute hardening', () => {
  beforeEach(() => {
    cloud.__setWXContext({ OPENID, APPID: 'test' })
  })

  test('double submit does NOT double-increment totalCompletions', async () => {
    const habitsCol = cloud.__getCol('habits')
    habitsCol.push({
      _id: 'h-dup',
      _openid: OPENID,
      name: '双提交',
      frequency: 'daily',
      isArchived: false,
      streakCurrent: 0,
      streakLongest: 0,
      totalCompletions: 0,
    })
    const createRes = await main({
      action: 'create',
      ritual: { name: '双提交仪式', habitIds: ['h-dup'] },
    })
    const ritualId = createRes.data._id

    // First execute: creates record, totalCompletions → 1
    const r1 = await main({
      action: 'execute',
      ritualId,
      completedHabitIds: ['h-dup'],
      date: '2026-04-05',
    })
    expect(r1.code).toBe(0)
    // Second execute on same day: existing path, no inc
    const r2 = await main({
      action: 'execute',
      ritualId,
      completedHabitIds: ['h-dup'],
      date: '2026-04-05',
    })
    expect(r2.code).toBe(0)
    const h = cloud.__getCol('habits').find(x => x._id === 'h-dup')
    expect(h.totalCompletions).toBe(1)
    // And exactly one check_in row exists
    const rows = cloud.__getCol('check_ins').filter(
      c => c.habitId === 'h-dup' && c.date === '2026-04-05',
    )
    expect(rows.length).toBe(1)
  })

  test('archived habit inside ritual is skipped with partial-failure entry', async () => {
    const habitsCol = cloud.__getCol('habits')
    habitsCol.push({
      _id: 'h-active',
      _openid: OPENID,
      name: 'active',
      frequency: 'daily',
      isArchived: false,
      streakCurrent: 0,
      streakLongest: 0,
      totalCompletions: 0,
    })
    habitsCol.push({
      _id: 'h-arch',
      _openid: OPENID,
      name: 'archived',
      frequency: 'daily',
      isArchived: true,
      streakCurrent: 0,
      streakLongest: 0,
      totalCompletions: 0,
    })
    const createRes = await main({
      action: 'create',
      ritual: { name: '混合仪式', habitIds: ['h-active', 'h-arch'] },
    })
    const res = await main({
      action: 'execute',
      ritualId: createRes.data._id,
      completedHabitIds: ['h-active', 'h-arch'],
      date: '2026-04-05',
    })
    expect(res.code).toBe(0)
    // Active habit succeeded
    expect(res.data.checkIns.length).toBe(1)
    expect(res.data.checkIns[0].habitId).toBe('h-active')
    // Archived habit surfaced via errors[]
    expect(res.data.errors).toBeDefined()
    const archErr = res.data.errors.find(e => e.habitId === 'h-arch')
    expect(archErr).toBeTruthy()
    expect(archErr.error).toBe('archived')
    // Archived habit untouched
    const archived = cloud.__getCol('habits').find(x => x._id === 'h-arch')
    expect(archived.totalCompletions).toBe(0)
  })

  test('rejects malformed date', async () => {
    const habitsCol = cloud.__getCol('habits')
    habitsCol.push({
      _id: 'h-d',
      _openid: OPENID,
      name: 'd',
      frequency: 'daily',
      isArchived: false,
    })
    const createRes = await main({
      action: 'create',
      ritual: { name: '日期仪式', habitIds: ['h-d'] },
    })
    const res = await main({
      action: 'execute',
      ritualId: createRes.data._id,
      completedHabitIds: ['h-d'],
      date: 'not-a-date',
    })
    expect(res.code).toBe(-1)
    expect(res.message).toContain('日期')
  })
})

// ── All-failed semantics ───────────────────────────────
// When every target habit fails, the response must NOT claim success.
// Partial success (some ok, some failed) keeps code:0 with errors[].
describe('ritual execute all-failed vs partial-success semantics', () => {
  beforeEach(() => {
    cloud.__setWXContext({ OPENID, APPID: 'test' })
  })

  test('all habits archived → code:-1 with errors[] in data', async () => {
    const habitsCol = cloud.__getCol('habits')
    habitsCol.push({
      _id: 'all-arch-1',
      _openid: OPENID,
      name: 'arch1',
      frequency: 'daily',
      isArchived: true,
    })
    habitsCol.push({
      _id: 'all-arch-2',
      _openid: OPENID,
      name: 'arch2',
      frequency: 'daily',
      isArchived: true,
    })
    const createRes = await main({
      action: 'create',
      ritual: { name: '全归档', habitIds: ['all-arch-1', 'all-arch-2'] },
    })
    const res = await main({
      action: 'execute',
      ritualId: createRes.data._id,
      completedHabitIds: ['all-arch-1', 'all-arch-2'],
      date: '2026-04-05',
    })
    expect(res.code).toBe(-1)
    expect(res.message).toBeTruthy()
    expect(res.data).toBeDefined()
    expect(res.data.checkIns.length).toBe(0)
    expect(res.data.errors.length).toBe(2)
    expect(res.data.errors.every(e => e.error === 'archived')).toBe(true)
  })

  test('partial success: 1 ok + 1 archived → code:0 with errors[]', async () => {
    const habitsCol = cloud.__getCol('habits')
    habitsCol.push({
      _id: 'ps-ok',
      _openid: OPENID,
      name: 'ok',
      frequency: 'daily',
      isArchived: false,
    })
    habitsCol.push({
      _id: 'ps-arch',
      _openid: OPENID,
      name: 'arch',
      frequency: 'daily',
      isArchived: true,
    })
    const createRes = await main({
      action: 'create',
      ritual: { name: '部分成功', habitIds: ['ps-ok', 'ps-arch'] },
    })
    const res = await main({
      action: 'execute',
      ritualId: createRes.data._id,
      completedHabitIds: ['ps-ok', 'ps-arch'],
      date: '2026-04-05',
    })
    expect(res.code).toBe(0)
    expect(res.data.checkIns.length).toBe(1)
    expect(res.data.errors.length).toBe(1)
    expect(res.data.errors[0].habitId).toBe('ps-arch')
  })

  test('pure success: all ok → code:0 with empty errors[]', async () => {
    const habitsCol = cloud.__getCol('habits')
    habitsCol.push({
      _id: 'pure-1',
      _openid: OPENID,
      name: 'pure1',
      frequency: 'daily',
      isArchived: false,
    })
    habitsCol.push({
      _id: 'pure-2',
      _openid: OPENID,
      name: 'pure2',
      frequency: 'daily',
      isArchived: false,
    })
    const createRes = await main({
      action: 'create',
      ritual: { name: '全成功', habitIds: ['pure-1', 'pure-2'] },
    })
    const res = await main({
      action: 'execute',
      ritualId: createRes.data._id,
      completedHabitIds: ['pure-1', 'pure-2'],
      date: '2026-04-05',
    })
    expect(res.code).toBe(0)
    expect(res.data.checkIns.length).toBe(2)
    expect(res.data.errors.length).toBe(0)
  })
})
