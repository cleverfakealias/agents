import { describe, expect, test } from 'claude-code/testing'

import {
  averageGrowth,
  compact,
  crossed,
  gauge,
  lastDelta,
  resetIn,
  signed,
  sparkline,
  turnsLeft,
  warning,
} from '../hooks/rules'

describe('estimates', () => {
  test('a compaction shows as a drop', () => {
    expect(signed(lastDelta([180_000, 40_000])!)).toBe('−140k')
  })
  test('average growth skips compactions', () => {
    expect(averageGrowth([100, 110, 30, 50])).toBe(15)
    expect(averageGrowth([100])).toBeUndefined()
  })
  test('turns left counts whole turns to the limit', () => {
    expect(turnsLeft(100_000, 167_000, 6_000)).toBe(11)
    expect(turnsLeft(100_000, 167_000, undefined)).toBeUndefined()
  })
  test('a sliver of use still shows one cell', () => {
    expect(gauge(100, 200_000, 10)).toEqual({ filled: '█', empty: '░'.repeat(9) })
  })
  test('resets read as a countdown within a day', () => {
    const now = Date.parse('2026-10-06T10:00:00Z')
    expect(resetIn('2026-10-06T12:10:00Z', now)).toBe('in 2h 10m')
    expect(resetIn('2026-10-06T10:20:00Z', now)).toBe('in 20m')
  })
})

describe('warnings', () => {
  test('each level warns once', () => {
    let s = crossed(50, 0)
    expect(s.level).toBeUndefined()
    s = crossed(76, s.warned)
    expect(s.level).toBe(75)
    s = crossed(80, s.warned)
    expect(s.level).toBeUndefined()
    s = crossed(91, s.warned)
    expect(s.level).toBe(90)
  })
  test('a drop after /compact re-arms the levels', () => {
    let s = crossed(92, 0)
    s = crossed(30, s.warned)
    expect(s.warned).toBe(0)
    expect(crossed(77, s.warned).level).toBe(75)
  })
  test('the 90% text suggests /compact', () => {
    expect(warning(90, { tokens: 900_000, window: 1_000_000, percent: 90 })).toContain('/compact')
  })
})

test('helpers', () => {
  expect(compact(950)).toBe('950')
  expect(compact(12_345)).toBe('12k')
  expect(sparkline([1, 8])).toBe('▁█')
})
