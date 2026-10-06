import type { On, RenderPropsOf, SessionContextBreakdown, SessionUsage, SessionUsageArgs } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const breakdown = {
  categories: [
    { name: 'Messages', tokens: 100_000, color: 'purple', isDeferred: false, kind: 'used' },
    { name: 'System tools', tokens: 20_000, color: 'gray', isDeferred: false, kind: 'used' },
    { name: 'MCP tools (deferred)', tokens: 9_000, color: 'gray', isDeferred: true, kind: 'deferred' },
    { name: 'Free space', tokens: 47_000, color: 'gray', isDeferred: false, kind: 'free' },
    { name: 'Autocompact buffer', tokens: 33_000, color: 'gray', isDeferred: false, kind: 'buffer' },
  ],
  isAutoCompactEnabled: true,
  autoCompactThreshold: 167_000,
  apiUsage: { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 9000, cache_creation_input_tokens: 0 },
  memoryFiles: [{ path: 'C:\\Users\\zenn\\.claude\\CLAUDE.md', type: 'User', tokens: 1200 }],
  mcpTools: [],
} as unknown as SessionContextBreakdown

const usage = (percent: number, args?: SessionUsageArgs): SessionUsage => ({
  startedAt: 0,
  context: { tokens: percent * 2000, window: 200_000, percent, ...(args?.breakdown ? { breakdown } : {}) },
  rateLimits: [{ kind: 'five_hour', percentUsed: 31 }],
  cost: { usd: 1.84 },
})

const props = (isWorking = false): RenderPropsOf['AbovePrompt'] => ({
  hasSurvey: false,
  isWorking,
  maxRows: 30,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 29 },
  view: {},
})

// Stands in for the engine's own (empty) band.
const engineBand = (on: On) =>
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

const answer = (on: On, percent: number) => {
  on('session.usage', (_$, args) => ({ value: usage(percent, args) }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: Date.parse('2026-10-06T10:00:00Z') }))
  on('ui.toast', () => ({ value: undefined }))
  engineBand(on)
}

const BAND = { plugin: 'context-meter', component: 'AbovePrompt' } as const

test('past 75% the band shows fill, the 5h limit and a Compact button on terminal and desktop', async ($, on) => {
  answer(on, 80)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface, props: props() })
    expect(await ui.find({ type: 'Text', text: /^80%$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /5h 31%/ })).toBeDefined()
    expect(await ui.find({ key: 'compact' })).toBeDefined()
    await ui.unmount()
  }
})

test('below 75%, or while a turn runs, there is no Compact button', async ($, on) => {
  answer(on, 40)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  for (const isWorking of [false, true]) {
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props(isWorking) })
    expect(await ui.find({ type: 'Text', text: /^40%$/ })).toBeDefined()
    expect(await ui.find({ key: 'compact' })).toBeUndefined()
    await ui.unmount()
  }
})

test('the toggle opens the breakdown, limits, cost and memory files, and closes it again', async ($, on) => {
  answer(on, 60)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface, props: props() })
    expect(await ui.find({ type: 'Text', text: /^Messages$/ })).toBeUndefined()
    await ui.press({ key: 'toggle' })
    expect(await ui.find({ type: 'Text', text: /^Messages$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Autocompact buffer$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /deferred/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /\$1\.84 · cache hit 90%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\.claude\/CLAUDE\.md 1k/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /autocompact at 167k/ })).toBeDefined()
    await ui.press({ key: 'toggle' })
    expect(await ui.find({ type: 'Text', text: /^Messages$/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('the band draws nothing before the first reading', async ($, on) => {
  engineBand(on)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  expect(await ui.find({ type: 'Text', text: /Context/ })).toBeUndefined()
  await ui.unmount()
})
