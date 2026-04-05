const {
  computeHistoricalMilestones,
} = require('../archive.milestones')

function seq(start, count) {
  const [y, m, d] = start.split('-').map(Number)
  const out = []
  const base = Date.UTC(y, m - 1, d)
  for (let i = 0; i < count; i++) {
    const t = new Date(base + i * 24 * 60 * 60 * 1000)
    const yy = t.getUTCFullYear()
    const mm = String(t.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(t.getUTCDate()).padStart(2, '0')
    out.push(`${yy}-${mm}-${dd}`)
  }
  return out
}

describe('computeHistoricalMilestones', () => {
  test('marks day-7 at the 7th consecutive check-in, not day 1 or 6', () => {
    const dates = seq('2026-01-01', 10)
    const result = computeHistoricalMilestones(new Map([['h1', dates]]))
    const hits = result.get('h1')
    expect(hits).toBeDefined()
    // 7th day after 2026-01-01 is 2026-01-07
    expect(hits.has('2026-01-07')).toBe(true)
    expect(hits.has('2026-01-06')).toBe(false)
    expect(hits.has('2026-01-01')).toBe(false)
  })

  test('marks day-7, day-21, day-30, day-100 on a 120-day run', () => {
    const dates = seq('2026-01-01', 120)
    const result = computeHistoricalMilestones(new Map([['h1', dates]]))
    const hits = result.get('h1')
    const target = (offset) => {
      const t = new Date(Date.UTC(2026, 0, 1) + offset * 24 * 3600 * 1000)
      const mm = String(t.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(t.getUTCDate()).padStart(2, '0')
      return `${t.getUTCFullYear()}-${mm}-${dd}`
    }
    expect(hits.has(target(6))).toBe(true)   // day 7
    expect(hits.has(target(20))).toBe(true)  // day 21
    expect(hits.has(target(29))).toBe(true)  // day 30
    expect(hits.has(target(99))).toBe(true)  // day 100
    // exactly those four, no extras
    expect(hits.size).toBe(4)
  })

  test('resets on gap — a broken streak never reaches day 7', () => {
    // 6 consecutive, gap, 5 consecutive — neither run hits 7
    const dates = [
      ...seq('2026-01-01', 6),
      ...seq('2026-01-10', 5),
    ]
    const result = computeHistoricalMilestones(new Map([['h1', dates]]))
    expect(result.has('h1')).toBe(false)
  })

  test('after gap the new run counts from 1 again and reaches day 7 independently', () => {
    const dates = [
      ...seq('2026-01-01', 3),  // broken run
      ...seq('2026-01-10', 7),  // new run hits day 7 on the 7th day
    ]
    const result = computeHistoricalMilestones(new Map([['h1', dates]]))
    const hits = result.get('h1')
    expect(hits).toBeDefined()
    expect(hits.has('2026-01-16')).toBe(true) // 2026-01-10 + 6 days
    expect(hits.size).toBe(1)
  })

  test('duplicate dates for the same habit are deduped, not double-counted', () => {
    // Legacy duplicate rows would otherwise inflate the streak
    const dates = [
      '2026-01-01', '2026-01-01',
      '2026-01-02', '2026-01-02',
      '2026-01-03', '2026-01-03',
      '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07',
    ]
    const result = computeHistoricalMilestones(new Map([['h1', dates]]))
    expect(result.get('h1').has('2026-01-07')).toBe(true)
    expect(result.get('h1').size).toBe(1)
  })

  test('dates out of order are sorted before streak walk', () => {
    const dates = ['2026-01-07', '2026-01-03', '2026-01-01', '2026-01-05', '2026-01-02', '2026-01-04', '2026-01-06']
    const result = computeHistoricalMilestones(new Map([['h1', dates]]))
    expect(result.get('h1').has('2026-01-07')).toBe(true)
  })

  test('per-habit isolation — one habit hitting milestone does not mark another', () => {
    const result = computeHistoricalMilestones(new Map([
      ['h1', seq('2026-01-01', 7)],
      ['h2', seq('2026-01-01', 3)],
    ]))
    expect(result.get('h1').has('2026-01-07')).toBe(true)
    expect(result.has('h2')).toBe(false)
  })

  test('empty inputs return empty map', () => {
    expect(computeHistoricalMilestones(new Map()).size).toBe(0)
    expect(computeHistoricalMilestones(new Map([['h1', []]])).size).toBe(0)
  })
})
