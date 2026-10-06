// Pure logic for context-meter: number formats, bars, the estimates and when to warn.

export type Reading = { tokens: number; window: number; percent: number }

const BARS = '▁▂▃▄▅▆▇█'

export const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

export const signed = (n: number) => `${n >= 0 ? '+' : '−'}${compact(Math.abs(n))}`

// One bar per turn, scaled to the fullest turn shown.
export function sparkline(history: readonly number[]): string {
  const max = Math.max(...history, 1)
  return history.map(t => BARS[Math.min(BARS.length - 1, Math.floor((t / max) * (BARS.length - 1)))]).join('')
}

// A bar of `cells` cells filled to `part / whole`; a sliver still shows one cell.
export function gauge(part: number, whole: number, cells: number): { filled: string; empty: string } {
  const ratio = whole > 0 ? Math.min(part / whole, 1) : 0
  const n = part > 0 ? Math.max(1, Math.round(ratio * cells)) : 0
  return { filled: '█'.repeat(n), empty: '░'.repeat(cells - n) }
}

export const level = (percent: number) => (percent >= 90 ? 'error' : percent >= 75 ? 'warning' : 'success')

// Growth of the last turn; a negative value is a compaction.
export const lastDelta = (h: readonly number[]) => (h.length >= 2 ? h[h.length - 1]! - h[h.length - 2]! : undefined)

// Mean growth over the last few turns that grew; drops (compactions) are left out.
export function averageGrowth(h: readonly number[], turns = 5): number | undefined {
  const deltas: number[] = []
  for (let i = h.length - 1; i > 0 && deltas.length < turns; i--) {
    const d = h[i]! - h[i - 1]!
    if (d > 0) deltas.push(d)
  }
  return deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : undefined
}

// Turns of average growth until `limit` (the autocompact point or the window).
export function turnsLeft(tokens: number, limit: number, growth: number | undefined): number | undefined {
  if (growth === undefined || growth <= 0) return undefined
  return Math.max(0, Math.floor((limit - tokens) / growth))
}

const LIMIT_NAMES: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }
export const limitName = (kind: string) => LIMIT_NAMES[kind] ?? kind

// "in 2h 10m" for a reset within a day, else the weekday.
export function resetIn(iso: string | undefined, now: number): string | undefined {
  if (iso === undefined) return undefined
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return undefined
  const mins = Math.max(0, Math.round((at - now) / 60_000))
  if (mins < 60) return `in ${mins}m`
  if (mins < 24 * 60) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(at).getDay()]
}

// The last two path parts: `.claude/CLAUDE.md`.
export const fileName = (path: string) => path.split(/[\\/]/).filter(Boolean).slice(-2).join('/')

export const LEVELS = [75, 90] as const

// The highest warning level newly crossed, or undefined. A drop (after /compact)
// re-arms the levels below the new reading.
export function crossed(percent: number, warned: number): { level?: number; warned: number } {
  const reached = LEVELS.filter(l => percent >= l).pop() ?? 0
  if (reached > warned) return { level: reached, warned: reached }
  return { warned: Math.min(warned, reached) }
}

export function warning(level: number, r: Reading): string {
  return level >= 90
    ? `Context is ${r.percent}% full. Run /compact at the next natural break, or start a fresh session for new work.`
    : `Context is ${r.percent}% full (${compact(r.tokens)} of ${compact(r.window)}). Plan a /compact soon.`
}
