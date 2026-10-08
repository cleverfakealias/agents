import type { ConfigRow, On, RenderPropsOf, SessionContextBreakdown, SessionUsage, SessionUsageArgs } from 'claude-code'
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

// `compactAt` stands for `autoCompactWindow`: the window the breakdown measures against.
const usage = (percent: number, args?: SessionUsageArgs, compactAt = 200_000): SessionUsage => ({
  startedAt: 0,
  context: {
    tokens: percent * 2000,
    window: 200_000,
    percent,
    ...(args?.breakdown ? { breakdown: { ...breakdown, rawMaxTokens: compactAt } } : {}),
  },
  rateLimits: [{ kind: 'five_hour', percentUsed: 31 }],
  cost: { usd: 1.84 },
})

const MODEL_ROW = {
  key: 'model',
  label: 'Model',
  kind: 'choice',
  value: 'opus[1m]',
  options: ['default', 'sonnet', 'opus', 'haiku', 'fable', 'best', 'sonnet[1m]', 'opus[1m]', 'fable[1m]', 'opusplan'],
  provider: { plugin: 'engine', tier: 'core' },
  isLocked: false,
} as unknown as ConfigRow

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

// Answers what the band reads beneath it; returns the slash commands it ran.
const answer = (on: On, percent: number, compactAt?: number) => {
  const runs: string[] = []
  on('session.usage', (_$, args) => ({ value: usage(percent, args, compactAt) }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5[1m]' }))
  on('config.list', () => ({ value: [MODEL_ROW] }))
  on('command.run', (_$, e) => {
    runs.push(`/${e.command} ${e.args}`)
    return { text: '' }
  })
  on('clock.now', () => ({ value: Date.parse('2026-10-06T10:00:00Z') }))
  on('ui.toast', () => ({ value: undefined }))
  engineBand(on)
  return runs
}

const BAND = { plugin: 'context-meter', component: 'AbovePrompt' } as const

test('desktop draws the big card, the terminal a text row with the same figures', async ($, on) => {
  answer(on, 80)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })

  const desk = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  const card = await desk.find({ type: 'Svg' })
  expect(card?.props.alt).toBe('Context 80% full, 160k of 200k tokens')
  // 80%: past the dumb-zone mark. The model and effort live in the controls, not the card.
  expect(String(card?.props.source)).toContain('Dumb zone')
  expect(String(card?.props.source)).not.toContain('Opus')
  expect(String(card?.props.source)).not.toContain('model max')
  expect(await desk.find({ key: 'model-opus' })).toBeDefined()
  expect(await desk.find({ key: 'compact' })).toBeDefined()
  await desk.unmount()

  const term = await $.ui.mount({ ...BAND, surface: 'terminal', props: props() })
  expect(await term.find({ type: 'Text', text: /^80%$/ })).toBeDefined()
  expect(await term.find({ type: 'Text', text: /5h 31%/ })).toBeDefined()
  await term.unmount()
})

test('fill is measured against the compaction window, as the Desktop picker shows it', async ($, on) => {
  // 80k tokens: 40% of the model's 200k, 80% of a 100k autoCompactWindow.
  answer(on, 40, 100_000)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const desk = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  const card = await desk.find({ type: 'Svg' })
  expect(card?.props.alt).toBe('Context 80% full, 80k of 100k tokens')
  expect(String(card?.props.source)).toContain('model max 200k')
  await desk.unmount()
  const term = await $.ui.mount({ ...BAND, surface: 'terminal', props: props() })
  expect(await term.find({ type: 'Text', text: /^80%$/ })).toBeDefined()
  expect(await term.find({ type: 'Text', text: /80k\/100k \(model max 200k\)/ })).toBeDefined()
  await term.unmount()
})

test('model buttons switch family and keep the 1M window; 1M toggles it', async ($, on) => {
  const runs = answer(on, 40)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  for (const surface of ['terminal', 'desktop'] as const) {
    runs.length = 0
    const ui = await $.ui.mount({ ...BAND, surface, props: props() })
    expect((await ui.find({ key: 'model-opus' }))?.props.label).toBe('◉ Opus')
    expect((await ui.find({ key: 'model-sonnet' }))?.props.label).toBe('○ Sonnet')
    expect((await ui.find({ key: 'model-1m' }))?.props.label).toBe('☑ 1M')
    expect(await ui.find({ key: 'model-default' })).toBeUndefined()
    expect(await ui.find({ key: 'model-opusplan' })).toBeUndefined()
    await ui.press({ key: 'model-sonnet' })
    await ui.press({ key: 'model-haiku' })
    await ui.press({ key: 'model-1m' })
    expect(runs).toEqual(['/model sonnet[1m]', '/model haiku', '/model opus'])
    await ui.unmount()
  }
})

test('effort buttons run /effort', async ($, on) => {
  const runs = answer(on, 40)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  await ui.press({ key: 'effort-high' })
  await ui.press({ key: 'effort-max' })
  expect(runs).toEqual(['/effort high', '/effort max'])
  await ui.unmount()
})

test('before the dumb zone, or while a turn runs, there is no Compact button', async ($, on) => {
  answer(on, 35)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  for (const isWorking of [false, true]) {
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props(isWorking) })
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
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  expect(await ui.find({ key: 'toggle' })).toBeUndefined()
  await ui.unmount()
})
