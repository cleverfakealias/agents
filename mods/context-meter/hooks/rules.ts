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

// A rate limit's color: it only matters close to the cap.
export const level = (percent: number) => (percent >= 90 ? 'error' : percent >= 75 ? 'warning' : 'success')

// Context quality, not capacity. The 2025-2026 long-context results tie the drop
// to token counts more than to a share of the window: on 1M models recall bends
// near 128k-256k, code repair and multi-step work sooner. Each mark is the
// smaller of a token count and a share of the window, so 200k windows warn early
// too. Set a little above the measured knee: no results exist yet for the 5.x models.
export const TIERS = {
  fading: { tokens: 200_000, share: 0.35 },
  dumb: { tokens: 350_000, share: 0.5 },
  // Where the meter writes a handoff doc, compacts, and reads the doc back.
  handoff: { tokens: 500_000, share: 0.75 },
} as const

export type Marks = { fading: number; dumb: number; handoff: number }

// With `autoCompactAt`, the handoff also comes before the engine's own compaction.
export const marks = (window: number, autoCompactAt?: number): Marks => ({
  fading: Math.min(TIERS.fading.tokens, Math.round(window * TIERS.fading.share)),
  dumb: Math.min(TIERS.dumb.tokens, Math.round(window * TIERS.dumb.share)),
  handoff: Math.min(
    TIERS.handoff.tokens,
    Math.round(window * TIERS.handoff.share),
    autoCompactAt ? Math.round(autoCompactAt * 0.9) : Infinity,
  ),
})

// 0 under the fading mark, 1 fading, 2 dumb zone, 3 handoff.
export const stageOf = (tokens: number, m: Marks) =>
  tokens >= m.handoff ? 3 : tokens >= m.dumb ? 2 : tokens >= m.fading ? 1 : 0

export const contextLevel = (tokens: number, m: Marks) =>
  tokens >= m.dumb ? 'error' : tokens >= m.fading ? 'warning' : 'success'

export type Zone = 'sharp' | 'quality fading' | 'dumb zone'

export const zoneName = (tokens: number, m: Marks): Zone =>
  tokens >= m.dumb ? 'dumb zone' : tokens >= m.fading ? 'quality fading' : 'sharp'

export function zoneHint(zone: Zone, m: Marks): string {
  if (zone === 'sharp') return `under ${compact(m.fading)}: full recall`
  if (zone === 'quality fading') return `${compact(m.fading)}–${compact(m.dumb)}: answers tend to slip`
  return `past ${compact(m.dumb)}: handoff and compact at ${compact(m.handoff)}`
}

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

// ── model and effort ──────────────────────────────────────────────────────────

export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

// The `/config` model row's value, `opus[1m]`, as a family and its 1M flag.
export function parseAlias(alias: string): { family: string; isLong: boolean } {
  const m = /^(.*?)(\[1m\])?$/i.exec(alias.trim())
  return { family: (m?.[1] ?? alias).toLowerCase(), isLong: Boolean(m?.[2]) }
}

// The families a button can pick, in the menu's order: plain aliases that are
// not presets (`default`, `best`, `opusplan`).
const PRESETS = new Set(['default', 'best', 'opusplan'])
export const families = (options: readonly string[]) =>
  options.filter(o => !o.includes('[') && !PRESETS.has(o.toLowerCase()))

// The live model id as a `/model` alias: `claude-opus-5-5[1m]` → `opus[1m]`;
// undefined for an id that names no family.
export function aliasOf(id: string): string | undefined {
  const m = /^claude-([a-z]+)-.*?(\[1m\])?$/i.exec(id.trim())
  return m ? `${m[1]!.toLowerCase()}${m[2] ? '[1m]' : ''}` : undefined
}

// The alias to set for a family, keeping the 1M window when that family has one.
export function aliasFor(family: string, isLong: boolean, options: readonly string[]): string {
  const long = `${family}[1m]`
  return isLong && options.includes(long) ? long : family
}

// `claude-opus-5-5` → `Opus 5.5`; an alias or unknown id comes back capitalised.
export function modelName(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/i.exec(id)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  if (!m) return cap(id.replace(/\[1m\]$/i, ''))
  const version = m[3] && m[3].length <= 2 ? `${m[2]}.${m[3]}` : m[2]
  return `${cap(m[1]!)} ${version}`
}

// ── the desktop card ──────────────────────────────────────────────────────────

const COLORS = { success: '#2ea043', warning: '#d29922', error: '#f85149' } as const

export type Card = {
  percent: number
  tokens: number
  window: number
  growth?: string
  left?: string
  // Set when the session compacts below the model's limit: `autocompacts at 400k`.
  windowNote?: string
  // A handoff in progress; it takes the place of growth and the countdown.
  status?: string
  // The session's marks; the window's own when absent.
  marks?: Marks
  limits: { name: string; percent: number; reset?: string }[]
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// One SVG: a ring gauge with the fill and ticks at the quality marks, the token
// figures large, the quality zone, and a bar per rate limit. Each text column
// stays left of the next, so nothing overlaps. Colors follow light or dark.
export function cardSvg(c: Card): string {
  const W = 760
  const H = 96
  const r = 34
  const circ = 2 * Math.PI * r
  const fill = Math.min(c.percent, 100) / 100
  const m = c.marks ?? marks(c.window)
  const color = COLORS[contextLevel(c.tokens, m)]
  const zone = zoneName(c.tokens, m)
  const sub = c.status ?? [c.growth, c.left, c.windowNote].filter(Boolean).join(' · ')
  // Ticks across the ring at the fading, dumb-zone and handoff marks.
  const ticks = [m.fading, m.dumb, m.handoff].map(t => {
    const a = ((t / c.window) * 360 - 90) * (Math.PI / 180)
    const [x1, y1, x2, y2] = [48 + (r - 7) * Math.cos(a), 48 + (r - 7) * Math.sin(a), 48 + (r + 7) * Math.cos(a), 48 + (r + 7) * Math.sin(a)]
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="2" class="tick"/>`
  })
  const BX = 540
  const bars = c.limits.slice(0, 2).map((l, i) => {
    const y = 26 + i * 34
    const w = 200
    const lc = COLORS[level(l.percent)]
    return (
      `<text x="${BX}" y="${y}" class="m" font-size="12">${esc(l.name)} limit` +
      `<tspan class="t" font-weight="600"> ${Math.round(l.percent)}%</tspan>` +
      `${l.reset ? `<tspan class="m"> · resets ${esc(l.reset)}</tspan>` : ''}</text>` +
      `<rect x="${BX}" y="${y + 7}" width="${w}" height="6" rx="3" class="track"/>` +
      `<rect x="${BX}" y="${y + 7}" width="${Math.max(3, (w * Math.min(l.percent, 100)) / 100)}" height="6" rx="3" fill="${lc}"/>`
    )
  })
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<style>.t{fill:#1f2328}.m{fill:#59636e}.track{fill:#d1d9e0}.ring{stroke:#d1d9e0}.tick{stroke:#59636e}` +
    `@media (prefers-color-scheme: dark){.t{fill:#e6edf3}.m{fill:#9198a1}.track{fill:#3d444d}.ring{stroke:#3d444d}.tick{stroke:#9198a1}}` +
    `text{font-family:ui-sans-serif,system-ui,'Segoe UI',sans-serif}</style>` +
    `<circle cx="48" cy="48" r="${r}" fill="none" stroke-width="9" class="ring"/>` +
    `<circle cx="48" cy="48" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" ` +
    `stroke-dasharray="${(circ * fill).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 48 48)"/>` +
    ticks.join('') +
    `<text x="48" y="55" text-anchor="middle" font-size="20" font-weight="700" class="t">${c.percent}%</text>` +
    `<text x="104" y="34" font-size="26" font-weight="700" class="t">${compact(c.tokens)}` +
    `<tspan class="m" font-size="16" font-weight="400"> / ${compact(c.window)} context</tspan></text>` +
    `<text x="104" y="57" font-size="13" class="m">${esc(sub || 'measuring growth after the next turn')}</text>` +
    `<circle cx="109" cy="75" r="4" fill="${color}"/>` +
    `<text x="119" y="80" font-size="13" class="t" font-weight="600">${zone.charAt(0).toUpperCase() + zone.slice(1)}` +
    `<tspan class="m" font-weight="400"> · ${esc(zoneHint(zone, m))}</tspan></text>` +
    bars.join('') +
    `</svg>`
  )
}

// The highest stage newly reached (1 fading, 2 dumb zone, 3 handoff), or
// undefined. A drop (after a compaction) re-arms the stages above the new reading.
export function crossed(stage: number, warned: number): { level?: number; warned: number } {
  if (stage > warned) return { level: stage, warned: stage }
  return { warned: Math.min(warned, stage) }
}

export function warning(stage: number, r: Reading, m: Marks): string {
  const fill = `Context holds ${compact(r.tokens)} (${r.percent}% of ${compact(r.window)}).`
  if (stage >= 3) return `${fill} At the end of this turn Claude writes a handoff doc, compacts, and reads the doc back.`
  if (stage >= 2)
    return `${fill} Past ${compact(m.dumb)} is the dumb zone: recall and reasoning drop, and each turn costs more. Hand off at a natural break, or start a fresh session.`
  return `${fill} Past ${compact(m.fading)}, answer quality tends to slip. Plan a handoff at the next natural break.`
}

// ── the handoff ───────────────────────────────────────────────────────────────

// Working notes in the repo, never committed (the folder ignores itself).
export const HANDOFF_DIR = '.claude/handoff'

export function handoffPath(root: string, sessionId: string, now: number): string {
  const base = root.replace(/\\/g, '/').replace(/\/+$/, '')
  return `${base}/${HANDOFF_DIR}/${new Date(now).toISOString().slice(0, 10)}-${sessionId.slice(0, 8)}.md`
}

export const handoffPrompt = (path: string, r: Reading) =>
  [
    `Context holds ${compact(r.tokens)} tokens. Before this conversation is compacted, write a handoff doc to ${path} with the Write tool (replace the file if it exists).`,
    'Write it for a fresh session that has none of this conversation. Use these sections:',
    '1. Goal: what the user wants, in their words where it matters.',
    '2. Current state: what is done, what is in progress, the branch and uncommitted changes.',
    '3. Decisions: what was chosen and why, and what the user rejected.',
    '4. Key files: each path with one line on its role.',
    '5. Open problems: errors seen, approaches that failed, gotchas.',
    '6. Next steps: numbered, the very next action first.',
    'Keep it under 300 lines. Do not start new work. When it is written, reply with one line.',
  ].join('\n')

export const compactInstructions = (path: string) =>
  `A handoff doc for this session is at ${path}. Name that path in the summary as the source of truth for state and next steps. Keep the user's latest request and any question still open to them.`

export const readPrompt = (path: string) =>
  [
    `This conversation was just compacted. Read the handoff doc at ${path}.`,
    'Check it against the repo: git status, and the files it names.',
    'Then say in a few lines what is stale or wrong, and what the next step is. Wait for me before you start it.',
  ].join('\n')
