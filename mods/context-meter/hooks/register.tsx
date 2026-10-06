import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Category, Detail, Meter } from '../types'
import {
  averageGrowth,
  compact,
  crossed,
  fileName,
  gauge,
  lastDelta,
  level,
  limitName,
  resetIn,
  signed,
  sparkline,
  turnsLeft,
  warning,
} from './rules'

const meter = atom({ plugin: 'context-meter', key: 'meter' } as const, null as Meter | null)
const detail = atom({ plugin: 'context-meter', key: 'detail' } as const, null as Detail | null)
const isOpen = atom({ plugin: 'context-meter', key: 'isOpen' } as const, false)
// The highest warning level already shown; kept in state so a reload doesn't repeat a toast.
const warned = atom({ plugin: 'context-meter', key: 'warned' } as const, 0)

// The free figures: fill, limits and cost. Cheap enough for every tool call.
async function refresh($: EngineInterface, isTurnEnd: boolean) {
  const usage = await $.session.usage()
  const { tokens, window, percent } = usage.context
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
    categories,
    autoCompactAt: b.isAutoCompactEnabled ? b.autoCompactThreshold : undefined,
    cacheHit: api && input > 0 ? Math.round((api.cache_read_input_tokens / input) * 100) : undefined,
    memoryFiles: [...b.memoryFiles].sort((a, z) => z.tokens - a.tokens).map(f => ({ path: f.path, tokens: f.tokens })),
    mcpTokens: b.mcpTools.filter(t => t.isLoaded).reduce((n, t) => n + t.tokens, 0),
  }))
}

const quietly = (p: Promise<unknown>) => p.catch(() => undefined)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await quietly(refresh($, false))
    void quietly(refreshDetail($))
    return result
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
      await quietly(refresh($, true))
      void quietly(refreshDetail($))
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, meter)
    if (e.props.hasSurvey || m === null) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const open = await read($, isOpen)
    const d = await read($, detail)
    const wide = e.props.bodyColumns >= 90
    const color = level(m.percent)
    const bar = gauge(m.tokens, m.window, wide ? 24 : 12)
    const delta = lastDelta(m.history)
    const growth = averageGrowth(m.history)
    const autoCompactAt = d?.autoCompactAt
    const left = turnsLeft(m.tokens, autoCompactAt ?? m.window, growth)
    const fiveHour = m.limits.find(l => l.kind === 'five_hour')

    const toggle = (
      <Button
        key="toggle"
        plain
        hotkey="d"
        label={`${open ? '▾' : '▸'} Context`}
        onPress={async () => {
          const opening = !(await read($, isOpen))
          await update($, isOpen, () => opening)
          if (opening) await quietly(refreshDetail($))
        }}
      />
    )

    const summary = (
      <Box flexDirection="row" gap={1} flexWrap="wrap">
        {toggle}
        <Text>
          <Text color={color}>{bar.filled}</Text>
          <Text dimColor>{bar.empty}</Text>
        </Text>
        <Text bold color={color}>
          {m.percent}%
        </Text>
        <Text dimColor>
          {compact(m.tokens)}/{compact(m.window)}
          {delta !== undefined ? ` · ${signed(delta)} last turn` : ''}
          {left !== undefined ? ` · ≈${left} turns to ${autoCompactAt ? 'autocompact' : 'full'}` : ''}
          {!open && fiveHour ? ` · 5h ${Math.round(fiveHour.percent)}%` : ''}
        </Text>
        {m.percent >= 75 && !e.props.isWorking ? (
          <Button key="compact" label="Compact" onPress={() => $.session.compact()} />
        ) : null}
      </Box>
    )
    if (!open) return summary

    const now = await $.clock.now()
    const label = (text: string) => (
      <Box width={10}>
        <Text dimColor>{text}</Text>
      </Box>
    )
    const used = (d?.categories ?? []).filter(c => c.kind === 'used').sort((a, z) => z.tokens - a.tokens)
    const rest = (d?.categories ?? []).filter(c => c.kind !== 'used')

    return (
      <Box flexDirection="column">
        {summary}
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
