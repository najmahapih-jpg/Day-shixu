const {
  offsetDateStr,
  toUtcDayTs,
  daysDiff,
  getMondayDate,
  dailyUniqueCount,
} = require('@/utils/homeWeekComparison')

describe('home week comparison math helpers', () => {
  test('offsetDateStr handles cross-month and cross-year boundaries', () => {
    expect(offsetDateStr('2026-04-10', -4)).toBe('2026-04-06')
    expect(offsetDateStr('2026-01-01', -1)).toBe('2025-12-31')
    expect(offsetDateStr('2024-02-28', 1)).toBe('2024-02-29')
    expect(offsetDateStr('invalid', 2)).toBe('invalid')
  })

  test('toUtcDayTs and daysDiff return stable UTC-based day math', () => {
    expect(toUtcDayTs('2026-04-10')).toBe(Date.UTC(2026, 3, 10))
    expect(toUtcDayTs('bad-date')).toBe(0)
    expect(daysDiff('2026-04-07', '2026-04-10')).toBe(3)
    expect(daysDiff('bad', '2026-04-10')).toBe(0)
  })

  test('getMondayDate normalizes weekdays and Sunday back to the same ISO week Monday', () => {
    expect(getMondayDate('2026-04-08')).toBe('2026-04-06')
    expect(getMondayDate('2026-04-12')).toBe('2026-04-06')
    expect(getMondayDate('2026-04-06')).toBe('2026-04-06')
  })

  test('dailyUniqueCount deduplicates habit ids within the same day and skips invalid records', () => {
    const counts = dailyUniqueCount([
      { habitId: 'habit-1', date: '2026-04-06' },
      { habitId: 'habit-1', date: '2026-04-06' },
      { habitId: 'habit-2', date: '2026-04-06' },
      { habitId: 'habit-3', date: '2026-04-07' },
      { habitId: '', date: '2026-04-07' },
      null,
      undefined,
    ])

    expect(Array.from(counts.entries())).toEqual([
      ['2026-04-06', 2],
      ['2026-04-07', 1],
    ])
  })
})
