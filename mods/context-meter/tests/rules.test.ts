import { describe, expect, test } from 'claude-code/testing'

import {
  aliasFor,
  aliasOf,
  averageGrowth,
  cardSvg,
  compact,
  contextLevel,
  crossed,
  families,
  gauge,
  lastDelta,
  modelName,
  parseAlias,
  resetIn,
  signed,
  sparkline,
  turnsLeft,
  warning,
  zoneName,
} from '../hooks/rules'

describe('model and effort', () => {
  const options = ['default', 'sonnet', 'opus', 'haiku', 'fable', 'best', 'sonnet[1m]', 'opus[1m]', 'fable[1m]', 'opusplan']
  test('an alias splits into family and 1M window', () => {
    expect(parseAlias('opus[1m]')).toEqual({ family: 'opus', isLong: true })
    expect(parseAlias('haiku')).toEqual({ family: 'haiku', isLong: false })
  })
  test('the live model id reads back as an alias, 1M mark kept', () => {
    expect(aliasOf('claude-opus-5-5[1m]')).toBe('opus[1m]')
    expect(aliasOf('claude-haiku-4-5-20251001')).toBe('haiku')
    expect(aliasOf('opusplan')).toBeUndefined()
  })
  test('presets are not family buttons', () => {
    expect(families(options)).toEqual(['sonnet', 'opus', 'haiku', 'fable'])
  })
  test('the 1M window carries over only where the family has one', () => {
    expect(aliasFor('sonnet', true, options)).toBe('sonnet[1m]')
    expect(aliasFor('haiku', true, options)).toBe('haiku')
    expect(aliasFor('opus', false, options)).toBe('opus')
  })
  test('model ids read as names', () => {
    expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
    expect(modelName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
    expect(modelName('claude-fable-5-1')).toBe('Fable 5.1')
    expect(modelName('opus[1m]')).toBe('Opus')
  })
})

test('the card is one SVG with the figures and escaped text', () => {
  const svg = cardSvg({
    percent: 52,
    tokens: 104_000,
    window: 200_000,
    growth: '+6k last turn',
    left: '≈11 turns to autocompact',
    windowNote: 'model max <1M>',
    limits: [{ name: '5h', percent: 31, reset: 'in 2h 10m' }],
  })
  expect(svg.startsWith('<svg')).toBe(true)
  expect(svg).toContain('>52%<')
  expect(svg).toContain('104k')
  expect(svg).toContain('resets in 2h 10m')
  expect(svg).toContain('model max &lt;1M&gt;')
  expect(svg).toContain('Dumb zone')
  expect(svg.length).toBeLessThan(131072)
})

test('the zone follows the quality marks, not capacity', () => {
  expect([10, 30, 39, 40, 90].map(zoneName)).toEqual(['sharp', 'quality fading', 'quality fading', 'dumb zone', 'dumb zone'])
  expect([10, 35, 45].map(contextLevel)).toEqual(['success', 'warning', 'error'])
})

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
  test('each level warns once: fading, dumb zone, near autocompact', () => {
    let s = crossed(20, 0)
    expect(s.level).toBeUndefined()
    s = crossed(31, s.warned)
    expect(s.level).toBe(30)
    s = crossed(35, s.warned)
    expect(s.level).toBeUndefined()
    s = crossed(42, s.warned)
    expect(s.level).toBe(40)
    s = crossed(91, s.warned)
    expect(s.level).toBe(90)
  })
  test('a drop after /compact re-arms the levels', () => {
    let s = crossed(45, 0)
    s = crossed(12, s.warned)
    expect(s.warned).toBe(0)
    expect(crossed(33, s.warned).level).toBe(30)
  })
  test('each text names the step to take', () => {
    const r = (percent: number) => ({ tokens: percent * 10_000, window: 1_000_000, percent })
    expect(warning(30, r(30))).toContain('slip')
    expect(warning(40, r(40))).toContain('dumb zone')
    expect(warning(90, r(90))).toContain('/compact')
  })
})

test('helpers', () => {
  expect(compact(950)).toBe('950')
  expect(compact(12_345)).toBe('12k')
  expect(sparkline([1, 8])).toBe('▁█')
})
