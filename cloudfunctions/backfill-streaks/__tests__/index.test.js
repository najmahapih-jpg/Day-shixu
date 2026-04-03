/**
 * backfill-streaks cloud function tests
 */

jest.mock('wx-server-sdk')
const cloud = require('wx-server-sdk')
const { main } = require('../index')

beforeEach(() => {
  cloud.__resetDB()
})

function seedHabit(overrides = {}) {
  const habitsCol = cloud.__getCol('habits')
  const habit = {
    _id: 'h1',
    _openid: 'user1',
    name: '测试习惯',
    frequency: 'daily',
    isArchived: false,
    streakCurrent: 0,
    streakLongest: 0,
    totalCompletions: 0,
    ...overrides,
  }
  habitsCol.push(habit)
  return habit
}

function seedCheckIn(habitId, date, openid = 'user1') {
  const col = cloud.__getCol('check_ins')
  col.push({
    _id: `ci-${habitId}-${date}`,
    _openid: openid,
    habitId,
    date,
    value: true,
    createdAt: date,
  })
}

// Helper to get today's date in the same format the backfill uses
function getToday() {
  const dt = new Date()
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const d = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysAgo(n) {
  const today = getToday()
  const [y, m, d] = today.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d - n))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

describe('backfill-streaks', () => {
  test('dry-run reports differences without writing', async () => {
    seedHabit({ _id: 'h1', streakCurrent: 0, streakLongest: 0 })
    seedCheckIn('h1', getToday())
    seedCheckIn('h1', daysAgo(1))

    const res = await main({ dryRun: true, habitId: 'h1' })
    expect(res.code).toBe(0)
    expect(res.data.dryRun).toBe(true)
    expect(res.data.processed).toBe(1)
    expect(res.data.changed).toBe(1)
    expect(res.data.details[0].newCurrent).toBeGreaterThan(0)

    // Verify DB was NOT updated
    const habitsCol = cloud.__getCol('habits')
    const habit = habitsCol.find(h => h._id === 'h1')
    expect(habit.streakCurrent).toBe(0)
  })

  test('write mode updates streakCurrent and streakLongest', async () => {
    seedHabit({ _id: 'h1', streakCurrent: 0, streakLongest: 0 })
    seedCheckIn('h1', getToday())
    seedCheckIn('h1', daysAgo(1))
    seedCheckIn('h1', daysAgo(2))

    const res = await main({ dryRun: false, habitId: 'h1' })
    expect(res.code).toBe(0)
    expect(res.data.changed).toBe(1)

    const habitsCol = cloud.__getCol('habits')
    const habit = habitsCol.find(h => h._id === 'h1')
    expect(habit.streakCurrent).toBe(3)
    expect(habit.streakLongest).toBe(3)
  })

  test('skips archived habits', async () => {
    seedHabit({ _id: 'archived', isArchived: true, streakCurrent: 0 })
    seedCheckIn('archived', '2026-04-02')

    const res = await main({ dryRun: true, batchSize: 50 })
    expect(res.code).toBe(0)
    expect(res.data.processed).toBe(0)
  })

  test('weekdays-only habit gets correct streak across weekend', async () => {
    seedHabit({ _id: 'wd', frequency: 'weekdays', streakCurrent: 1, streakLongest: 1 })
    // Mon-Fri of week ending 2026-03-27, plus Mon 2026-03-30
    const days = ['2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-30']
    days.forEach(d => seedCheckIn('wd', d))

    const res = await main({ dryRun: false, habitId: 'wd' })
    expect(res.code).toBe(0)

    const habitsCol = cloud.__getCol('habits')
    const habit = habitsCol.find(h => h._id === 'wd')
    // 6 weekdays in a row (weekend skipped)
    expect(habit.streakLongest).toBe(6)
  })

  test('already-correct habits are not changed', async () => {
    seedHabit({ _id: 'correct', streakCurrent: 2, streakLongest: 2 })
    seedCheckIn('correct', getToday())
    seedCheckIn('correct', daysAgo(1))

    const res = await main({ dryRun: true, habitId: 'correct' })
    expect(res.code).toBe(0)
    expect(res.data.changed).toBe(0)
    expect(res.data.unchanged).toBe(1)
  })

  test('daily habit with yesterday checked but today open keeps streakCurrent', async () => {
    // User checked in yesterday but not yet today — streak should be 1, not 0
    seedHabit({ _id: 'grace', frequency: 'daily', streakCurrent: 1, streakLongest: 1 })
    seedCheckIn('grace', daysAgo(1))

    const res = await main({ dryRun: true, habitId: 'grace' })
    expect(res.code).toBe(0)
    // streakCurrent should remain 1 (today is skipped, yesterday is checked)
    if (res.data.changed === 0) {
      expect(res.data.unchanged).toBe(1)
    } else {
      expect(res.data.details[0].newCurrent).toBe(1)
    }
  })

  test('daily habit with 3-day streak and today open preserves streak', async () => {
    seedHabit({ _id: 'grace3', frequency: 'daily', streakCurrent: 3, streakLongest: 3 })
    seedCheckIn('grace3', daysAgo(1))
    seedCheckIn('grace3', daysAgo(2))
    seedCheckIn('grace3', daysAgo(3))

    const res = await main({ dryRun: true, habitId: 'grace3' })
    expect(res.code).toBe(0)
    expect(res.data.changed).toBe(0)
    expect(res.data.unchanged).toBe(1)
  })

  test('weekdays habit with today open (weekday) still preserves streak', async () => {
    // Today is a weekday, not yet checked in — should not break streak
    // Use daysAgo to create a run of recent weekday check-ins
    seedHabit({ _id: 'wd-grace', frequency: 'weekdays', streakCurrent: 1, streakLongest: 1 })
    // Find the most recent past weekday
    let d = 1
    while (true) {
      const date = daysAgo(d)
      const [y, m, dd] = date.split('-').map(Number)
      const wd = new Date(Date.UTC(y, m - 1, dd)).getUTCDay()
      if (wd >= 1 && wd <= 5) {
        seedCheckIn('wd-grace', date)
        break
      }
      d++
    }

    const res = await main({ dryRun: true, habitId: 'wd-grace' })
    expect(res.code).toBe(0)
    // Whether today is a weekday or weekend, the streak from yesterday should be preserved
    if (res.data.changed > 0) {
      expect(res.data.details[0].newCurrent).toBeGreaterThanOrEqual(1)
    }
  })

  test('returns nextSkip when batch is full', async () => {
    for (let i = 0; i < 5; i++) {
      seedHabit({ _id: `batch-${i}`, name: `习惯${i}` })
    }

    const res = await main({ dryRun: true, batchSize: 3, skip: 0 })
    expect(res.code).toBe(0)
    expect(res.data.processed).toBe(3)
    expect(res.data.nextSkip).toBe(3)
  })

  test('returns null nextSkip when batch is not full', async () => {
    seedHabit({ _id: 'only-one' })

    const res = await main({ dryRun: true, batchSize: 50 })
    expect(res.code).toBe(0)
    expect(res.data.nextSkip).toBeNull()
  })

  test('handles inflated streakLongest by reducing it', async () => {
    // Streak was inflated to 10 by old check+uncheck bug, but only 3 consecutive exist
    seedHabit({ _id: 'inflated', streakCurrent: 3, streakLongest: 10 })
    seedCheckIn('inflated', getToday())
    seedCheckIn('inflated', daysAgo(1))
    seedCheckIn('inflated', daysAgo(2))

    const res = await main({ dryRun: false, habitId: 'inflated' })
    expect(res.code).toBe(0)
    expect(res.data.changed).toBe(1)

    const habitsCol = cloud.__getCol('habits')
    const habit = habitsCol.find(h => h._id === 'inflated')
    expect(habit.streakLongest).toBe(3) // deflated from 10 to 3
  })

  test('defaults to dryRun when no params given', async () => {
    seedHabit({ _id: 'safe', streakCurrent: 0 })
    seedCheckIn('safe', getToday())

    const res = await main()
    expect(res.code).toBe(0)
    expect(res.data.dryRun).toBe(true)
  })
})
