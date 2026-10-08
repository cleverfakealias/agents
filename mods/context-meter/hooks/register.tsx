import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Category, Detail, Meter, Setup } from '../types'
import {
  DUMB_ZONE,
  EFFORTS,
  aliasFor,
  aliasOf,
  averageGrowth,
  cardSvg,
  compact,
  contextLevel,
  crossed,
  families,
  fileName,
  gauge,
  lastDelta,
  limitName,
  parseAlias,
  resetIn,
  signed,
  sparkline,
  turnsLeft,
  warning,
  zoneName,
} from './rules'

const meter = atom({ plugin: 'context-meter', key: 'meter' } as const, null as Meter | null)
const detail = atom({ plugin: 'context-meter', key: 'detail' } as const, null as Detail | null)
const setup = atom({ plugin: 'context-meter', key: 'setup' } as const, null as Setup | null)
const isOpen = atom({ plugin: 'context-meter', key: 'isOpen' } as const, false)
// The highest warning level already shown; kept in state so a reload doesn't repeat a toast.
const warned = atom({ plugin: 'context-meter', key: 'warned' } as const, 0)

// The free figures: fill, limits and cost. Cheap enough for every tool call.
async function refresh($: EngineInterface, isTurnEnd: boolean) {
  const usage = await $.session.usage()
  const { tokens, window: modelWindow } = usage.context
  // Measure against the window the session compacts at (`autoCompactWindow`),
  // as /context and the Desktop picker do, not the model's full limit.
  const compactWindow = (await read($, detail))?.window
  const window = compactWindow && compactWindow < modelWindow ? compactWindow : modelWindow
  const percent = tokens === undefined ? undefined : Math.round((tokens / window) * 100)
  await update($, meter, prev => {
    const history = [...(prev?.history ?? [])]
    if (isTurnEnd && tokens !== undefined) {
      history.push(tokens)
      if (history.length > 12) history.shift()
    }
    return {
      tokens: tokens ?? 0,
      window,
      modelWindow,
      percent: percent ?? 0,
      history,
      limits: usage.rateLimits.map(l => ({ kind: l.kind, percent: l.percentUsed, resetsAt: l.resetsAt })),
      usd: usage.cost?.usd,
    }
  })
  if (tokens === undefined || percent === undefined) return
  const alert = crossed(percent, await read($, warned))
  await update($, warned, () => alert.warned)
  if (alert.level !== undefined) $.ui.toast(warning(alert.level, { tokens, window, percent }), { timeoutMs: 12000 })
}

// The /context breakdown, estimated locally (no token-count requests).
async function refreshDetail($: EngineInterface) {
  const b = (await $.session.usage({ breakdown: 'summary' })).context.breakdown
  if (b === undefined) return
  const api = b.apiUsage
  const input = api ? api.input_tokens + api.cache_read_input_tokens + api.cache_creation_input_tokens : 0
  const categories: Category[] = b.categories
    .filter((c): c is typeof c & { kind: Category['kind'] } => c.kind !== 'deferred')
    .map(c => ({ name: c.name, tokens: c.tokens, color: c.color, kind: c.kind }))
  await update($, detail, () => ({
    window: b.rawMaxTokens,
    windowSource: b.autocompactSource,
    categories,
    autoCompactAt: b.isAutoCompactEnabled ? b.autoCompactThreshold : undefined,
    cacheHit: api && input > 0 ? Math.round((api.cache_read_input_tokens / input) * 100) : undefined,
    memoryFiles: [...b.memoryFiles].sort((a, z) => z.tokens - a.tokens).map(f => ({ path: f.path, tokens: f.tokens })),
    mcpTokens: b.mcpTools.filter(t => t.isLoaded).reduce((n, t) => n + t.tokens, 0),
  }))
}

// The model buttons: choices from the `/config` model row, the current pick
// from the live session. The row holds the saved default, which a session-only
// `/model` leaves alone, so it is only the fallback.
async function refreshSetup($: EngineInterface) {
  const row = (await $.config.list()).find(r => r.key === 'model')
  if (!row) return
  const model = await $.session.model().catch(() => undefined)
  const alias = (model && aliasOf(model)) ?? (typeof row.value === 'string' ? row.value : undefined)
  await update($, setup, prev => ({ ...prev, alias, options: [...(row.options ?? [])], model: model ?? prev?.model }))
}

// Runs `/model` or `/effort` as if typed; it is queued until the session is idle.
async function runCommand($: EngineInterface, command: 'model' | 'effort', args: string) {
  await $.command.run({ command, args })
  await quietly(refreshSetup($))
}

const quietly = (p: Promise<unknown>) => p.catch(() => undefined)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    // The breakdown first: it says which window the meter measures against.
    await quietly(refreshDetail($))
    await quietly(refresh($, false))
    await quietly(refreshSetup($))
    return result
  })

  // Each main-loop request carries the effort in use. Its model id may drop the
  // `[1m]` mark, so the model comes from `$.session.model()` instead.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const { effort } = e
      void quietly(update($, setup, prev => (prev?.effort === effort ? prev : { options: [], ...prev, effort })))
    }
    return yield* next(e)
  })

  // Live during a turn: each finished tool call follows a fresh API response.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    // Not awaited, so the meter never holds up a tool result.
    void quietly(refresh($, false))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // Subagents have their own context; only the main conversation counts here.
    if (e.agentId === undefined) {
      await quietly(refreshDetail($))
      await quietly(refresh($, true))
      void quietly(refreshSetup($))
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, meter)
    if (e.props.hasSurvey || m === null) return next(e)

    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    // The terminal draws no images; every other surface takes the SVG card.
    const Svg = e.surface !== 'terminal' && 'Svg' in els ? els.Svg : undefined
    const open = await read($, isOpen)
    const d = await read($, detail)
    const s = await read($, setup)
    const now = await $.clock.now()
    const wide = e.props.bodyColumns >= 90
    const color = contextLevel(m.percent)
    const delta = lastDelta(m.history)
    const growth = averageGrowth(m.history)
    const autoCompactAt = d?.autoCompactAt
    // Before the dumb zone, count down to it; inside it, to autocompact.
    const isDumb = m.percent >= DUMB_ZONE
    const target = isDumb ? (autoCompactAt ?? m.window) : (m.window * DUMB_ZONE) / 100
    const left = turnsLeft(m.tokens, target, growth)
    const leftText =
      left === undefined ? undefined : `≈${left} turns to ${isDumb ? (autoCompactAt ? 'autocompact' : 'full') : 'the dumb zone'}`
    const current = s?.alias ? parseAlias(s.alias) : undefined
    const effort = typeof s?.effort === 'string' ? s.effort : undefined
    const windowNote = m.modelWindow > m.window ? `model max ${compact(m.modelWindow)}` : undefined

    const toggle = (
      <Button
        key="toggle"
        plain
        hotkey="d"
        label={Svg ? `${open ? '▾' : '▸'} Details` : `${open ? '▾' : '▸'} Context`}
        onPress={async () => {
          const opening = !(await read($, isOpen))
          await update($, isOpen, () => opening)
          if (opening) await quietly(refreshDetail($))
        }}
      />
    )

    // The big view where the surface draws images; a text row in the terminal.
    const headline =
      Svg ? (
        <Svg
          key="card"
          alt={`Context ${m.percent}% full, ${compact(m.tokens)} of ${compact(m.window)} tokens`}
          source={cardSvg({
            percent: m.percent,
            tokens: m.tokens,
            window: m.window,
            growth: delta !== undefined ? `${signed(delta)} last turn` : undefined,
            left: leftText,
            windowNote,
            limits: m.limits.map(l => ({ name: limitName(l.kind), percent: l.percent, reset: resetIn(l.resetsAt, now) })),
          })}
        />
      ) : (
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          {toggle}
          <Text>
            <Text color={color}>{gauge(m.tokens, m.window, wide ? 24 : 12).filled}</Text>
            <Text dimColor>{gauge(m.tokens, m.window, wide ? 24 : 12).empty}</Text>
          </Text>
          <Text bold color={color}>
            {m.percent}%
          </Text>
          <Text color={color}>{zoneName(m.percent)}</Text>
          <Text dimColor>
            {compact(m.tokens)}/{compact(m.window)}
            {m.modelWindow > m.window ? ` (model max ${compact(m.modelWindow)})` : ''}
            {delta !== undefined ? ` · ${signed(delta)} last turn` : ''}
            {leftText ? ` · ${leftText}` : ''}
            {m.limits.find(l => l.kind === 'five_hour') ? ` · 5h ${Math.round(m.limits.find(l => l.kind === 'five_hour')!.percent)}%` : ''}
          </Text>
        </Box>
      )

    const options = s?.options ?? []
    const at = effort ? EFFORTS.indexOf(effort as (typeof EFFORTS)[number]) : -1
    // Two quiet rows: a radio group for the model, a stepped slider for effort.
    // Plain Buttons draw as bare text, so the glyphs carry the state.
    const controls = (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={2} flexWrap="wrap" alignItems="center">
          {options.length ? (
            <Box width={7}>
              <Text dimColor>Model</Text>
            </Box>
          ) : null}
          {families(options).map(f => (
            <Button
              key={`model-${f}`}
              plain
              dimColor={current?.family !== f}
              label={`${current?.family === f ? '◉' : '○'} ${f.charAt(0).toUpperCase() + f.slice(1)}`}
              onPress={() => runCommand($, 'model', aliasFor(f, current?.isLong ?? false, options))}
            />
          ))}
          {current && options.includes(`${current.family}[1m]`) ? (
            <Button
              key="model-1m"
              plain
              dimColor={!current.isLong}
              label={`${current.isLong ? '☑' : '☐'} 1M`}
              onPress={() => runCommand($, 'model', current.isLong ? current.family : `${current.family}[1m]`)}
            />
          ) : null}
          {Svg ? toggle : null}
        </Box>
        <Box flexDirection="row" alignItems="center" flexWrap="wrap">
          <Box width={9}>
            <Text dimColor>Effort</Text>
          </Box>
          <Text dimColor>low </Text>
          {EFFORTS.map((choice, i) => (
            <Box key={`stop-${choice}`} flexDirection="row">
              {i > 0 ? <Text dimColor={i > at}>──</Text> : null}
              <Button
                key={`effort-${choice}`}
                plain
                dimColor={i > at}
                label={i === at ? '◉' : i < at ? '●' : '○'}
                onPress={() => runCommand($, 'effort', choice)}
              />
            </Box>
          ))}
          <Text dimColor> max</Text>
          <Text bold>{effort ? `  ${effort}` : ''}</Text>
          {m.percent >= DUMB_ZONE && !e.props.isWorking ? (
            <Box marginLeft={3}>
              <Button key="compact" label="Compact" onPress={() => $.session.compact()} />
            </Box>
          ) : null}
        </Box>
      </Box>
    )

    if (!open) {
      return (
        <Box flexDirection="column">
          {headline}
          {controls}
        </Box>
      )
    }

    const label = (text: string) => (
      <Box width={10}>
        <Text dimColor>{text}</Text>
      </Box>
    )
    const used = (d?.categories ?? []).filter(c => c.kind === 'used').sort((a, z) => z.tokens - a.tokens)
    const rest = (d?.categories ?? []).filter(c => c.kind !== 'used')

    return (
      <Box flexDirection="column">
        {headline}
        {controls}
        <Box flexDirection="column" paddingLeft={2} marginTop={1}>
          {d === null ? <Text dimColor>Counting…</Text> : null}
          {[...used, ...rest].map(c => {
            const g = gauge(c.tokens, m.window, wide ? 20 : 10)
            return (
              <Box key={`cat-${c.name}`} flexDirection="row" gap={1}>
                <Box width={22}>
                  <Text dimColor={c.kind !== 'used'} wrap="truncate">
                    {c.name}
                  </Text>
                </Box>
                <Box width={6} justifyContent="flex-end">
                  <Text>{compact(c.tokens)}</Text>
                </Box>
                <Text color={c.kind === 'used' ? c.color : undefined} dimColor={c.kind !== 'used'}>
                  {c.kind === 'free' ? '' : g.filled}
                </Text>
                <Text dimColor>{Math.round((c.tokens / m.window) * 100)}%</Text>
              </Box>
            )
          })}

          <Box flexDirection="row" marginTop={1}>
            {label('Growth')}
            <Text dimColor>
              {m.history.length >= 2 ? `${sparkline(m.history.slice(-12))} ` : 'one turn so far'}
              {growth !== undefined ? ` avg ${signed(Math.round(growth))}/turn` : ''}
              {autoCompactAt ? ` · autocompact at ${compact(autoCompactAt)}` : ' · autocompact off'}
            </Text>
          </Box>
          {m.limits.length ? (
            <Box flexDirection="row">
              {label('Limits')}
              <Text dimColor>
                {m.limits
                  .map(l => {
                    const when = resetIn(l.resetsAt, now)
                    return `${limitName(l.kind)} ${Math.round(l.percent)}%${when ? ` (resets ${when})` : ''}`
                  })
                  .join(' · ')}
              </Text>
            </Box>
          ) : null}
          <Box flexDirection="row">
            {label('Session')}
            <Text dimColor>
              {m.usd !== undefined ? `$${m.usd.toFixed(2)}` : 'cost n/a'}
              {d?.cacheHit !== undefined ? ` · cache hit ${d.cacheHit}% on the last request` : ''}
              {d && d.mcpTokens > 0 ? ` · MCP tools ${compact(d.mcpTokens)}` : ''}
            </Text>
          </Box>
          {d && d.memoryFiles.length ? (
            <Box flexDirection="row">
              {label('Memory')}
              <Text dimColor wrap="truncate">
                {d.memoryFiles
                  .slice(0, 4)
                  .map(f => `${fileName(f.path)} ${compact(f.tokens)}`)
                  .join(' · ')}
              </Text>
            </Box>
          ) : null}
        </Box>
      </Box>
    )
  })
}
