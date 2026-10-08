import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Category, Detail, Handoff, Meter, Setup } from '../types'
import {
  EFFORTS,
  HANDOFF_DIR,
  aliasFor,
  aliasOf,
  averageGrowth,
  cardSvg,
  compact,
  compactInstructions,
  contextLevel,
  crossed,
  families,
  fileName,
  gauge,
  handoffPath,
  handoffPrompt,
  lastDelta,
  limitName,
  marks,
  parseAlias,
  readPrompt,
  resetIn,
  signed,
  sparkline,
  stageOf,
  turnsLeft,
  warning,
  zoneName,
} from './rules'

const meter = atom({ plugin: 'context-meter', key: 'meter' } as const, null as Meter | null)
const detail = atom({ plugin: 'context-meter', key: 'detail' } as const, null as Detail | null)
const setup = atom({ plugin: 'context-meter', key: 'setup' } as const, null as Setup | null)
const isOpen = atom({ plugin: 'context-meter', key: 'isOpen' } as const, false)
// The highest warning stage already shown; kept in state so a reload doesn't repeat a toast.
const warned = atom({ plugin: 'context-meter', key: 'warned' } as const, 0)
const handoff = atom({ plugin: 'context-meter', key: 'handoff' } as const, null as Handoff | null)

const PHASE_TEXT: Record<Handoff['phase'], string> = {
  queued: 'handoff queued: it starts when this turn ends',
  writing: 'handoff 1/3: Claude writes the doc',
  compacting: 'handoff 2/3: compacting',
  reading: 'handoff 3/3: Claude reads the doc back',
}

// The free figures: fill, limits and cost. Cheap enough for every tool call.
async function refresh($: EngineInterface, isTurnEnd: boolean) {
  const usage = await $.session.usage()
  // Always the model's full window: the percent is a share of it, whatever
  // window the session happens to compact at.
  const { tokens, window } = usage.context
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
      percent: percent ?? 0,
      history,
      limits: usage.rateLimits.map(l => ({ kind: l.kind, percent: l.percentUsed, resetsAt: l.resetsAt })),
      usd: usage.cost?.usd,
    }
  })
  if (tokens === undefined || percent === undefined) return
  const m = marks(window, (await read($, detail))?.autoCompactAt)
  const alert = crossed(stageOf(tokens, m), await read($, warned))
  await update($, warned, () => alert.warned)
  if (alert.level === undefined) return
  $.ui.toast(warning(alert.level, { tokens, window, percent }, m), { timeoutMs: 12000 })
  // The handoff runs between turns: queue it for the end of this one.
  if (alert.level >= 3) await update($, handoff, prev => prev ?? { phase: 'queued' as const })
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

// Runs `/model`, `/effort` or `/compact` as if typed: queued until the session is
// idle, with its usual transcript lines. A refusal shows as a toast, never silence.
async function runCommand($: EngineInterface, command: 'model' | 'effort' | 'compact', args = ''): Promise<boolean> {
  try {
    await $.command.run({ command, args })
  } catch (err) {
    $.ui.toast(`/${command} did not run: ${message(err)}`)
    return false
  }
  await quietly(refreshSetup($))
  return true
}

const quietly = (p: Promise<unknown>) => p.catch(() => undefined)
const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

// The handoff, step 1: ask for the doc, as a turn of its own once the session is idle.
async function beginHandoff($: EngineInterface) {
  const m = await read($, meter)
  const root = await $.session.root()
  const now = await $.clock.now()
  const path = handoffPath(root, await $.session.id(), now)
  // The folder ignores itself: handoff docs are working notes, never commits.
  await quietly($.fs.write(`${path.slice(0, path.lastIndexOf('/'))}/.gitignore`, '*\n'))
  await update($, handoff, () => ({ phase: 'writing' as const, path, since: now, waited: 0 }))
  const r = { tokens: m?.tokens ?? 0, window: m?.window ?? 0, percent: m?.percent ?? 0 }
  void $.prompt.submit({ text: handoffPrompt(path, r) }).catch(async err => {
    $.ui.toast(`The handoff did not start: ${message(err)}`)
    await update($, handoff, () => null)
  })
}

// Step 2, at the end of the doc's turn: compact, with the doc named. Step 4, at
// the end of the read-back turn: done. Step 3 is in the session.compact hook.
async function advanceHandoff($: EngineInterface) {
  const job = await read($, handoff)
  if (job?.phase === 'reading') return void (await update($, handoff, () => null))
  if (job?.phase !== 'writing' || !job.path) return
  const path = job.path
  const st = await $.fs.stat(path).catch(() => undefined)
  // Two seconds of slack between the engine's clock and the file system's.
  if (st?.kind === 'file' && st.mtimeMs >= (job.since ?? 0) - 2000) {
    await update($, handoff, () => ({ ...job, phase: 'compacting' as const }))
    // Not awaited: /compact waits for the idle session, which this hook holds.
    void runCommand($, 'compact', compactInstructions(path)).then(async ok => {
      if (!ok) await update($, handoff, () => null)
    })
    return
  }
  // A prompt queued earlier may run first: wait one more turn, then give up.
  if ((job.waited ?? 0) < 1) return void (await update($, handoff, () => ({ ...job, waited: (job.waited ?? 0) + 1 })))
  $.ui.toast(`No handoff doc at ${path}, so nothing was compacted. Press Handoff to try again.`)
  await update($, handoff, () => null)
}

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

  on('session.compact', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    const job = await read($, handoff)
    const m = await read($, meter)
    // The engine's own compaction never runs without a handoff doc. While there
    // is room, hold it and hand off when the turn ends. Near the hard limit it runs.
    if (e.trigger === 'auto' && job?.phase !== 'compacting' && m && m.tokens < m.window - 25_000) {
      if (job === null) await update($, handoff, () => ({ phase: 'queued' as const }))
      return { skip: 'context-meter writes a handoff doc first, when this turn ends' }
    }
    const result = await next(e)
    // Step 3: compacted with the doc named; Claude reads it back as its own turn.
    if (job?.phase === 'compacting' && job.path) {
      const path = job.path
      if (result.messages === undefined) await update($, handoff, () => null)
      else {
        await update($, handoff, () => ({ ...job, phase: 'reading' as const }))
        void $.prompt.submit({ text: readPrompt(path) }).catch(() => update($, handoff, () => null))
      }
    }
    // A compaction ends no turn: record its drop and redraw at once.
    void quietly(refreshDetail($).then(() => refresh($, true)))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // Subagents have their own context; only the main conversation counts here.
    if (e.agentId === undefined) {
      await quietly(advanceHandoff($))
      await quietly(refreshDetail($))
      await quietly(refresh($, true))
      if ((await read($, handoff))?.phase === 'queued') await quietly(beginHandoff($))
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
    const job = await read($, handoff)
    const wide = e.props.bodyColumns >= 90
    const autoCompactAt = d?.autoCompactAt
    const mk = marks(m.window, autoCompactAt)
    const color = contextLevel(m.tokens, mk)
    const delta = lastDelta(m.history)
    const growth = averageGrowth(m.history)
    // Before the dumb zone, count down to it; inside it, to the handoff.
    const isDumb = m.tokens >= mk.dumb
    const left = turnsLeft(m.tokens, isDumb ? mk.handoff : mk.dumb, growth)
    const leftText = left === undefined ? undefined : `≈${left} turns to ${isDumb ? 'the handoff' : 'the dumb zone'}`
    const status = job ? PHASE_TEXT[job.phase] : undefined
    const current = s?.alias ? parseAlias(s.alias) : undefined
    const effort = typeof s?.effort === 'string' ? s.effort : undefined
    // Only when this session compacts well before the model's window (a leftover
    // `autoCompactWindow`, say): the meter's percent still counts the full window.
    const compactAt = d ? Math.min(d.autoCompactAt ?? d.window, d.window) : undefined
    const windowNote = compactAt && compactAt < m.window * 0.9 ? `autocompacts at ${compact(compactAt)}` : undefined

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
            status,
            marks: mk,
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
          <Text color={color}>{zoneName(m.tokens, mk)}</Text>
          <Text dimColor>
            {compact(m.tokens)}/{compact(m.window)}
            {windowNote ? ` (${windowNote})` : ''}
            {status ? ` · ${status}` : ''}
            {!status && delta !== undefined ? ` · ${signed(delta)} last turn` : ''}
            {!status && leftText ? ` · ${leftText}` : ''}
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
              // The 1M variant wherever a family has one; Haiku has none and stays 200k.
              onPress={() => runCommand($, 'model', aliasFor(f, true, options))}
            />
          ))}
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
          {/* Doc, compaction, read-back: the same steps the meter runs at the handoff mark. */}
          {isDumb && !e.props.isWorking && (job === null || job.phase === 'queued') ? (
            <Box marginLeft={3}>
              <Button key="handoff" label="Handoff" onPress={() => beginHandoff($)} />
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
              {` · handoff at ${compact(mk.handoff)}`}
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
