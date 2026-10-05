import type { EngineInterface, Register } from 'claude-code'

import { type Reading, crossed, statusText, warning } from './rules'

// Tokens after each main-loop turn, newest last. A reload starts it over.
const history: number[] = []
let warned = 0

async function refresh($: EngineInterface, isTurnEnd: boolean) {
  const usage = await $.session.usage()
  const { tokens, window, percent } = usage.context
  if (tokens === undefined || percent === undefined) {
    $.ui.status(`context 0% · ${Math.round(window / 1000)}k window`)
    return
  }
  const reading: Reading = { tokens, window, percent }
  if (isTurnEnd) {
    history.push(tokens)
    if (history.length > 12) history.shift()
  }
  const fiveHour = usage.rateLimits.find(l => l.kind === 'five_hour')?.percentUsed
  $.ui.status(statusText(reading, history, fiveHour))

  const next = crossed(percent, warned)
  warned = next.warned
  if (next.level !== undefined) $.ui.toast(warning(next.level, reading), { timeoutMs: 12000 })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($, false).catch(() => undefined)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // Subagents have their own context; only the main conversation counts here.
    if (e.agentId === undefined) await refresh($, true).catch(() => undefined)
    return result
  })
}
