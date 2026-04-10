const {
  computeHistoricalMilestones,
  mergeArchiveBatch,
  shouldApplyFetchResult,
} = require('../archive.milestones.cjs')

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

describe('mergeArchiveBatch', () => {
  test('dedupes overlapping days by id', () => {
    const existing = [
      { id: '2026-03-10', date: '2026-03-10' },
      { id: '2026-03-09', date: '2026-03-09' },
    ]
    const incoming = [
      { id: '2026-03-10', date: '2026-03-10' }, // overlap
      { id: '2026-03-08', date: '2026-03-08' }, // new
    ]
    const merged = mergeArchiveBatch(existing, incoming)
    expect(merged).toHaveLength(3)
    expect(merged.map((a) => a.id)).toEqual([
      '2026-03-10',
      '2026-03-09',
      '2026-03-08',
    ])
  })

  test('two overlapped fetches never produce duplicate days', () => {
    // Simulates fetchArchive() called twice with overlapping windows
    // (30-day batches covering the same region)
    const batch1 = [
      { id: '2026-03-10', date: '2026-03-10' },
      { id: '2026-03-05', date: '2026-03-05' },
    ]
    const batch2 = [
      { id: '2026-03-05', date: '2026-03-05' }, // overlap
      { id: '2026-03-01', date: '2026-03-01' }, // new
    ]
    const afterFirst = mergeArchiveBatch([], batch1)
    const afterSecond = mergeArchiveBatch(afterFirst, batch2)
    const ids = afterSecond.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length) // no dupes
    expect(ids).toEqual(['2026-03-10', '2026-03-05', '2026-03-01'])
  })

  test('preserves descending date order after merge', () => {
    const existing = [{ id: '2026-01-05', date: '2026-01-05' }]
    const incoming = [
      { id: '2026-01-10', date: '2026-01-10' },
      { id: '2026-01-01', date: '2026-01-01' },
      { id: '2026-01-07', date: '2026-01-07' },
    ]
    const merged = mergeArchiveBatch(existing, incoming)
    const dates = merged.map((a) => a.date)
    expect(dates).toEqual([
      '2026-01-10',
      '2026-01-07',
      '2026-01-05',
      '2026-01-01',
    ])
  })

  test('empty incoming returns existing unchanged (sorted)', () => {
    const existing = [
      { id: '2026-01-01', date: '2026-01-01' },
      { id: '2026-01-02', date: '2026-01-02' },
    ]
    const merged = mergeArchiveBatch(existing, [])
    expect(merged.map((a) => a.date)).toEqual(['2026-01-02', '2026-01-01'])
  })
})

describe('shouldApplyFetchResult (stale-response guard)', () => {
  test('stale version is rejected (captured < current)', () => {
    // A fetch captured version=1, meanwhile $reset() bumped to 2
    expect(shouldApplyFetchResult(1, 2)).toBe(false)
  })

  test('current version is accepted', () => {
    expect(shouldApplyFetchResult(3, 3)).toBe(true)
  })

  test('models the reset-during-flight scenario', () => {
    // Store version starts at 0
    let current = 0
    // Fetch #1 starts, captures v1
    const captured1 = ++current // 1
    // $reset() is called — bumps version
    current++ // 2
    // Fetch #2 starts, captures v3
    const captured2 = ++current // 3
    // Fetch #1 resolves late → should be rejected
    expect(shouldApplyFetchResult(captured1, current)).toBe(false)
    // Fetch #2 resolves → should be applied
    expect(shouldApplyFetchResult(captured2, current)).toBe(true)
  })
})
