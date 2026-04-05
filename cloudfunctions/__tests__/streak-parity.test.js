/**
 * Parity guard for the canonical streak module.
 *
 * Each cloud function carries its own copy of `streak.js` because WeChat
 * cloud functions package per-directory. This test asserts that every copy
 * is byte-identical to cloudfunctions/_shared/streak.js. If you see this
 * test fail, run `node cloudfunctions/scripts/sync-shared.js`.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CANONICAL_PATH = path.join(ROOT, '_shared', 'streak.js')
const TARGETS = ['habit', 'ritual', 'stats', 'backfill-streaks']

describe('streak.js canonical parity', () => {
  const canonicalBuf = fs.readFileSync(CANONICAL_PATH)

  test.each(TARGETS)(
    '%s/streak.js matches _shared/streak.js byte-for-byte',
    (fn) => {
      const copyPath = path.join(ROOT, fn, 'streak.js')
      expect(fs.existsSync(copyPath)).toBe(true)
      const copyBuf = fs.readFileSync(copyPath)
      expect(copyBuf.equals(canonicalBuf)).toBe(true)
    },
  )

  test('canonical exports the expected surface', () => {
    const streak = require('../_shared/streak')
    expect(typeof streak.calcStreak).toBe('function')
    expect(typeof streak.calcLongestStreak).toBe('function')
    expect(typeof streak.isHabitActiveOnDate).toBe('function')
    expect(typeof streak.parseDate).toBe('function')
  })

  test('open-day grace: unchecked today does not break streak', () => {
    const { calcStreak } = require('../_shared/streak')
    const habit = { frequency: 'daily' }
    const today = '2026-04-05'
    const recentDates = ['2026-04-05', '2026-04-04', '2026-04-03']
    // Checked only the two prior days, today is open
    const checked = new Set(['2026-04-04', '2026-04-03'])
    expect(calcStreak(recentDates, checked, null, habit, today)).toBe(2)
  })

  test('no today: unchecked day breaks streak immediately', () => {
    const { calcStreak } = require('../_shared/streak')
    const habit = { frequency: 'daily' }
    const recentDates = ['2026-04-05', '2026-04-04', '2026-04-03']
    const checked = new Set(['2026-04-04', '2026-04-03'])
    // Without today param, '2026-04-05' unchecked immediately breaks
    expect(calcStreak(recentDates, checked, null, habit)).toBe(0)
  })

  test('each per-function copy produces identical output as canonical', () => {
    const canonical = require('../_shared/streak')
    const cases = [
      {
        habit: { frequency: 'daily' },
        recentDates: ['2026-04-05', '2026-04-04', '2026-04-03'],
        checked: new Set(['2026-04-05', '2026-04-04']),
        today: '2026-04-05',
      },
      {
        habit: { frequency: 'weekdays' },
        recentDates: ['2026-04-05', '2026-04-04', '2026-04-03', '2026-04-02'],
        checked: new Set(['2026-04-03', '2026-04-02']),
        today: '2026-04-05',
      },
      {
        habit: { frequency: 'custom', customDays: [1, 3, 5] },
        recentDates: ['2026-04-06', '2026-04-05', '2026-04-04', '2026-04-03'],
        checked: new Set(['2026-04-03']),
        today: '2026-04-06',
      },
    ]

    for (const fn of TARGETS) {
      const copy = require(path.join(ROOT, fn, 'streak.js'))
      for (const c of cases) {
        const exp = canonical.calcStreak(c.recentDates, c.checked, null, c.habit, c.today)
        const got = copy.calcStreak(c.recentDates, c.checked, null, c.habit, c.today)
        expect(got).toBe(exp)

        const expL = canonical.calcLongestStreak(c.recentDates, c.checked, null, c.habit)
        const gotL = copy.calcLongestStreak(c.recentDates, c.checked, null, c.habit)
        expect(gotL).toBe(expL)
      }
    }
  })
})
