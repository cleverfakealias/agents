// Pure logic for context-meter: the status line text and when to warn.

export type Reading = { tokens: number; window: number; percent: number }

const BARS = '▁▂▃▄▅▆▇█'

export const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

// One bar per turn, scaled to the fullest turn shown.
export function sparkline(history: readonly number[]): string {
  const max = Math.max(...history, 1)
  return history.map(t => BARS[Math.min(BARS.length - 1, Math.floor((t / max) * (BARS.length - 1)))]).join('')
}

export function statusText(r: Reading, history: readonly number[], fiveHour?: number): string {
  const parts = [`context ${r.percent}%`, `${compact(r.tokens)}/${compact(r.window)}`]
  if (history.length >= 2) {
    const delta = history[history.length - 1] - history[history.length - 2]
    parts.push(`${delta >= 0 ? '+' : '−'}${compact(Math.abs(delta))} last turn`)
    parts.push(sparkline(history.slice(-8)))
  }
  if (fiveHour !== undefined) parts.push(`5h limit ${Math.round(fiveHour)}%`)
  return parts.join(' · ')
}

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
