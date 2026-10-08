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
  // The dumb zone, where the Handoff button turns solid: a doc, a fresh
  // context, the doc read back, each time the person asks for it, never alone.
  dumb: { tokens: 350_000, share: 0.5 },
} as const

export type Marks = { fading: number; dumb: number }

// With `autoCompactAt`, the handoff also comes before the engine's own compaction.
export function marks(window: number, autoCompactAt?: number): Marks {
  const dumb = Math.min(
    TIERS.dumb.tokens,
    Math.round(window * TIERS.dumb.share),
    autoCompactAt ? Math.round(autoCompactAt * 0.9) : Infinity,
  )
  return { fading: Math.min(TIERS.fading.tokens, Math.round(window * TIERS.fading.share), dumb), dumb }
}

// The engine's own autocompact waits for a handoff until this close to the
// window; past it, it runs so the session cannot jam.
export const forcedCompactAt = (window: number) => window - 25_000

// 0 under the fading mark, 1 fading, 2 dumb zone (the handoff).
export const stageOf = (tokens: number, m: Marks) => (tokens >= m.dumb ? 2 : tokens >= m.fading ? 1 : 0)

export const contextLevel = (tokens: number, m: Marks) =>
  tokens >= m.dumb ? 'error' : tokens >= m.fading ? 'warning' : 'success'

export type Zone = 'sharp' | 'quality fading' | 'dumb zone'

export const zoneName = (tokens: number, m: Marks): Zone =>
  tokens >= m.dumb ? 'dumb zone' : tokens >= m.fading ? 'quality fading' : 'sharp'

export function zoneHint(zone: Zone, m: Marks): string {
  if (zone === 'sharp') return `under ${compact(m.fading)}: full recall`
  if (zone === 'quality fading') return `${compact(m.fading)}–${compact(m.dumb)}: answers tend to slip`
  return `past ${compact(m.dumb)}: handoff, then a fresh context`
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

// Turns of average growth until `limit` (the handoff, or a forced compact).
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
  // A handoff in progress; it takes the place of growth and the countdown.
  status?: string
  // The session's marks; the window's own when absent.
  marks?: Marks
  limits: { name: string; percent: number; reset?: string }[]
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The card's grid, in viewBox units. The surface scales the whole drawing to
// the slot, so only the proportions matter: three columns that never touch.
const CARD = {
  w: 760,
  h: 96,
  ring: { cx: 48, cy: 48, r: 34 },
  // The text column: the figures, the zone, then growth. Clipped at its edge.
  text: { x: 104, right: 516 },
  // The rate-limit column: one label and bar per limit.
  limits: { x: 540, w: 204, first: 24, step: 36 },
} as const

// Cuts a line to fit its column, by an average glyph width for the font size
// (a UI sans at mixed case and digits runs near half the size per glyph).
export function fit(text: string, widthPx: number, fontSize: number): string {
  const max = Math.floor(widthPx / (fontSize * 0.5))
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

// One SVG: a ring gauge with the fill and ticks at the quality marks, the token
// figures large, the quality zone, the growth, and a bar per rate limit. Each
// line is cut to its column and the column is clipped, so nothing overlaps.
// Colors follow light or dark.
export function cardSvg(c: Card): string {
  const { w: W, h: H, ring, text, limits } = CARD
  const circ = 2 * Math.PI * ring.r
  const fill = Math.min(c.percent, 100) / 100
  const m = c.marks ?? marks(c.window)
  const color = COLORS[contextLevel(c.tokens, m)]
  const zone = zoneName(c.tokens, m)
  const zoneLabel = zone.charAt(0).toUpperCase() + zone.slice(1)
  const sub = c.status ?? [c.growth, c.left].filter(Boolean).join(' · ')
  const col = text.right - text.x
  // Ticks across the ring at the fading and dumb-zone marks.
  const ticks = [m.fading, m.dumb].map(t => {
    const a = ((t / c.window) * 360 - 90) * (Math.PI / 180)
    const [x1, y1, x2, y2] = [
      ring.cx + (ring.r - 7) * Math.cos(a),
      ring.cy + (ring.r - 7) * Math.sin(a),
      ring.cx + (ring.r + 7) * Math.cos(a),
      ring.cy + (ring.r + 7) * Math.sin(a),
    ]
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="2" class="tick"/>`
  })
  const bars = c.limits.slice(0, 2).map((l, i) => {
    const y = limits.first + i * limits.step
    const lc = COLORS[level(l.percent)]
    const reset = l.reset ? ` · resets ${l.reset}` : ''
    const label = fit(`${l.name} limit ${Math.round(l.percent)}%${reset}`, limits.w, 12)
    const pct = `${Math.round(l.percent)}%`
    // The percent in full strength, the rest dim; split only when the cut kept it.
    const at = label.indexOf(pct)
    const labelMarkup =
      at >= 0
        ? `${esc(label.slice(0, at))}<tspan class="t" font-weight="600">${esc(pct)}</tspan>${esc(label.slice(at + pct.length))}`
        : esc(label)
    return (
      `<text x="${limits.x}" y="${y}" class="m" font-size="12">${labelMarkup}</text>` +
      `<rect x="${limits.x}" y="${y + 8}" width="${limits.w}" height="6" rx="3" class="track"/>` +
      `<rect x="${limits.x}" y="${y + 8}" width="${Math.max(3, (limits.w * Math.min(l.percent, 100)) / 100).toFixed(1)}" height="6" rx="3" fill="${lc}"/>`
    )
  })
  const figure = `${compact(c.tokens)}`
  const suffix = ` / ${compact(c.window)} context`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<style>.t{fill:#1f2328}.m{fill:#59636e}.track{fill:#d1d9e0}.ring{stroke:#d1d9e0}.tick{stroke:#59636e}.rule{stroke:#d1d9e0}` +
    `@media (prefers-color-scheme: dark){.t{fill:#e6edf3}.m{fill:#9198a1}.track{fill:#3d444d}.ring{stroke:#3d444d}.tick{stroke:#9198a1}.rule{stroke:#3d444d}}` +
    `text{font-family:ui-sans-serif,system-ui,'Segoe UI',sans-serif}</style>` +
    `<defs><clipPath id="col"><rect x="${text.x}" y="0" width="${col}" height="${H}"/></clipPath></defs>` +
    // The ring: track, fill, the marks, the percent.
    `<circle cx="${ring.cx}" cy="${ring.cy}" r="${ring.r}" fill="none" stroke-width="9" class="ring"/>` +
    `<circle cx="${ring.cx}" cy="${ring.cy}" r="${ring.r}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" ` +
    `stroke-dasharray="${(circ * fill).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${ring.cx} ${ring.cy})"/>` +
    ticks.join('') +
    `<text x="${ring.cx}" y="${ring.cy + 7}" text-anchor="middle" font-size="20" font-weight="700" class="t">${c.percent}%</text>` +
    // The text column, three lines, clipped at its right edge.
    `<g clip-path="url(#col)">` +
    `<text x="${text.x}" y="34" font-size="26" font-weight="700" class="t">${esc(figure)}` +
    `<tspan class="m" font-size="16" font-weight="400">${esc(fit(suffix, col - figure.length * 15, 16))}</tspan></text>` +
    `<circle cx="${text.x + 5}" cy="54" r="4" fill="${color}"/>` +
    `<text x="${text.x + 15}" y="59" font-size="13" class="t" font-weight="600">${esc(zoneLabel)}` +
    `<tspan class="m" font-weight="400">${esc(fit(` · ${zoneHint(zone, m)}`, col - 15 - zoneLabel.length * 8, 13))}</tspan></text>` +
    `<text x="${text.x}" y="82" font-size="13" class="m">${esc(fit(sub || 'measuring growth after the next turn', col, 13))}</text>` +
    `</g>` +
    // A hairline between the text and the limits.
    (bars.length ? `<line x1="${limits.x - 16}" y1="18" x2="${limits.x - 16}" y2="${H - 18}" stroke-width="1" class="rule"/>` : '') +
    bars.join('') +
    `</svg>`
  )
}

// The highest stage newly reached (1 fading, 2 dumb zone), or undefined. A drop
// (after a compaction) re-arms the stages above the new reading.
export function crossed(stage: number, warned: number): { level?: number; warned: number } {
  if (stage > warned) return { level: stage, warned: stage }
  return { warned: Math.min(warned, stage) }
}

export function warning(stage: number, r: Reading, m: Marks): string {
  const fill = `Context holds ${compact(r.tokens)} (${r.percent}% of ${compact(r.window)}).`
  if (stage >= 2)
    return `${fill} Past ${compact(m.dumb)} is the dumb zone: recall and reasoning drop, and each turn costs more. Press Handoff (or type /handoff) at a good stopping point: Claude writes a state doc, the context is cleared, and Claude reads the doc back.`
  return `${fill} Past ${compact(m.fading)}, answer quality tends to slip. The dumb zone starts at ${compact(m.dumb)}; Handoff is yours to press.`
}

// A session that loaded a smaller compaction window than the model has (an old
// `autoCompactWindow`, say) keeps it for the life of its process: `/clear` and
// the handoff keep the process, so only a new chat loads the model's own.
// Undefined when the two are close.
export function windowNote(loaded: number | undefined, model: number): string | undefined {
  if (loaded === undefined || loaded >= model * 0.9) return undefined
  return `This chat loaded a ${compact(loaded)} window from an old setting. The handoff keeps it; a new chat gets the full ${compact(model)}.`
}

// The tokens every request carries before the conversation itself: the system
// prompt, tool schemas, memory files, MCP tools. Paid on every turn.
export const baseline = (categories: readonly { name: string; tokens: number; kind: string }[]) =>
  categories.filter(c => c.kind === 'used' && !/^messages$/i.test(c.name)).reduce((n, c) => n + c.tokens, 0)

// ── the handoff ───────────────────────────────────────────────────────────────

export const HANDOFF_COMMAND = {
  name: 'handoff',
  description: 'Write a state doc, clear the context, read the doc back (context-meter).',
} as const

// Working notes in the repo, never committed (the folder ignores itself).
export const HANDOFF_DIR = '.claude/handoff'

// `2026-10-06-1000-abcdef12.md`: the time (UTC) keeps a retry from writing over
// a good doc from earlier the same day.
export function handoffPath(root: string, sessionId: string, now: number): string {
  const base = root.replace(/\\/g, '/').replace(/\/+$/, '')
  const iso = new Date(now).toISOString()
  return `${base}/${HANDOFF_DIR}/${iso.slice(0, 10)}-${iso.slice(11, 16).replace(':', '')}-${sessionId.slice(0, 8)}.md`
}

export const handoffPrompt = (path: string, r: Reading) =>
  [
    `Context holds ${compact(r.tokens)} tokens. Before this context is cleared, write a handoff doc to ${path} with the Write tool (replace the file if it exists).`,
    'Write it for a fresh session that has none of this conversation. Use these sections:',
    '1. Goal: what the user wants, in their words where it matters.',
    '2. Current state: what is done, what is in progress, the branch and uncommitted changes.',
    '3. Decisions: what was chosen and why, and what the user rejected.',
    '4. Key files: each path with one line on its role.',
    '5. Open problems: errors seen, approaches that failed, gotchas.',
    '6. Next steps: numbered, the very next action first.',
    'Keep it under 300 lines. Do not start new work. When it is written, reply with one line.',
  ].join('\n')

// For the fallback, when `/clear` is refused.
export const compactInstructions = (path: string) =>
  `A handoff doc for this session is at ${path}. Name that path in the summary as the source of truth for state and next steps. Keep the user's latest request and any question still open to them.`

export const readPrompt = (path: string, how: 'cleared' | 'compacted') =>
  [
    `The context was just ${how} for a handoff. Read the handoff doc at ${path}.`,
    'Check it against the repo: git status, and the files it names.',
    'Then say in a few lines what is stale or wrong, and what the next step is. Wait for me before you start it.',
  ].join('\n')
