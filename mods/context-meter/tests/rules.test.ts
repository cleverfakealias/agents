import { describe, expect, test } from 'claude-code/testing'

import { compact, crossed, sparkline, statusText, warning } from '../hooks/rules'

describe('statusText', () => {
  test('first reading shows fill and window', () => {
    expect(statusText({ tokens: 134_400, window: 1_000_000, percent: 13 }, [134_400])).toBe('context 13% · 134k/1.0M')
  })
  test('later readings add growth, a sparkline and the 5-hour limit', () => {
    const text = statusText({ tokens: 300_000, window: 1_000_000, percent: 30 }, [100_000, 200_000, 300_000], 42.4)
    expect(text).toBe('context 30% · 300k/1.0M · +100k last turn · ▃▅█ · 5h limit 42%')
  })
  test('a compaction shows as a drop', () => {
    expect(statusText({ tokens: 40_000, window: 200_000, percent: 20 }, [180_000, 40_000])).toContain('−140k last turn')
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
