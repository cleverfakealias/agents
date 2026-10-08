import type { ConfigRow, On, RenderPropsOf, SessionContextBreakdown, SessionUsage, SessionUsageArgs } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

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

// A 200k window: the marks are 70k (fading) and 100k (dumb zone, where the handoff runs).
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

const NOW = Date.parse('2026-10-06T10:00:00Z')
const DOC = 'Z:/repo/.claude/handoff/2026-10-06-abcdef12.md'
// A compaction leaves at least one message: the summary.
const SUMMARY = [{ role: 'user' as const, text: 'Summary of the conversation so far.', toolUses: [] }]

// Stands in for the engine's own (empty) band.
const engineBand = (on: On) =>
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

// Answers what the band reads beneath it; records the slash commands it ran,
// the prompts it submitted, the files it wrote and the compactions that ran.
const answer = (on: On, percent: number, compactAt?: number) => {
  const seen = {
    runs: [] as string[],
    prompts: [] as string[],
    writes: [] as string[],
    compactions: [] as string[],
    toasts: [] as string[],
    // Files the model wrote with its own tools.
    docs: [] as string[],
    isBusy: false,
    // Commands the session refuses.
    refused: [] as string[],
  }
  on('session.usage', (_$, args) => ({ value: usage(percent, args, compactAt) }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5[1m]' }))
  on('config.list', () => ({ value: [MODEL_ROW] }))
  on('command.run', (_$, e) => {
    if (seen.isBusy || seen.refused.includes(e.command)) throw new Error('busy')
    seen.runs.push(`/${e.command} ${e.args}`)
    return { text: '' }
  })
  on('clock.now', () => ({ value: NOW }))
  on('ui.toast', (_$, e) => {
    seen.toasts.push(e.text)
    return { value: undefined }
  })
  on('session.root', () => ({ value: 'Z:\\repo' }))
  on('session.id', () => ({ value: 'abcdef1234567890' }))
  on('fs.write', (_$, e) => {
    seen.writes.push(e.path)
    return { value: undefined }
  })
  on('fs.stat', (_$, e) => {
    if (!seen.docs.includes(e.path.replace(/\\/g, '/'))) throw new Error('ENOENT')
    return { value: { kind: 'file', size: 900, mtimeMs: NOW, isLink: false } }
  })
  on('prompt.submit', (_$, e) => {
    seen.prompts.push(e.text)
    return { text: e.text }
  })
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.compact', (_$, e) => {
    seen.compactions.push(e.trigger)
    return { messages: SUMMARY }
  })
  engineBand(on)
  return seen
}

// A main-loop turn ending.
const turnEnds = ($: Engine) =>
  $.turn.complete({ turnId: 't', answer: 'ok', durationMs: 1, isAborted: false, reason: 'answer' })

// Lets the steps the hooks leave running (not awaited) finish.
// The kit's types leave out timers, but the test runtime has them.
const tick = (globalThis as unknown as { setTimeout: (fn: () => void, ms: number) => unknown }).setTimeout
const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise<void>(resolve => tick(resolve, 0))
}

const BAND = { plugin: 'context-meter', component: 'AbovePrompt' } as const

test('desktop draws the big card, the terminal a text row with the same figures', async ($, on) => {
  answer(on, 60)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })

  const desk = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  const card = await desk.find({ type: 'Svg' })
  expect(card?.props.alt).toBe('Context 60% full, 120k of 200k tokens')
  // 120k: past the 100k dumb-zone mark. The model and effort live in the controls, not the card.
  expect(String(card?.props.source)).toContain('Dumb zone')
  expect(String(card?.props.source)).toContain('past 100k: handoff, then a fresh context')
  expect(String(card?.props.source)).not.toContain('Opus')
  expect(await desk.find({ key: 'model-opus' })).toBeDefined()
  expect(await desk.find({ key: 'handoff' })).toBeDefined()
  await desk.unmount()

  const term = await $.ui.mount({ ...BAND, surface: 'terminal', props: props() })
  expect(await term.find({ type: 'Text', text: /^60%$/ })).toBeDefined()
  expect(await term.find({ type: 'Text', text: /^dumb zone$/ })).toBeDefined()
  expect(await term.find({ type: 'Text', text: /5h 31%/ })).toBeDefined()
  await term.unmount()
})

test('the zones follow tokens: 70k on a 200k window is already fading', async ($, on) => {
  answer(on, 35)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const term = await $.ui.mount({ ...BAND, surface: 'terminal', props: props() })
  expect(await term.find({ type: 'Text', text: /^quality fading$/ })).toBeDefined()
  expect(await term.find({ type: 'Text', text: /turns to the dumb zone|70k\/200k/ })).toBeDefined()
  await term.unmount()
})

test('fill counts the full model window; an early autocompact shows as a note', async ($, on) => {
  // 80k tokens: 40% of the model's 200k, with a leftover 100k autoCompactWindow.
  answer(on, 40, 100_000)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const desk = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  const card = await desk.find({ type: 'Svg' })
  expect(card?.props.alt).toBe('Context 40% full, 80k of 200k tokens')
  expect(String(card?.props.source)).toContain('autocompacts at 100k')
  await desk.unmount()
  const term = await $.ui.mount({ ...BAND, surface: 'terminal', props: props() })
  expect(await term.find({ type: 'Text', text: /^40%$/ })).toBeDefined()
  expect(await term.find({ type: 'Text', text: /80k\/200k \(autocompacts at 100k\)/ })).toBeDefined()
  await term.unmount()
})

test('model buttons pick the 1M variant wherever a family has one', async ($, on) => {
  const { runs } = answer(on, 40)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  for (const surface of ['terminal', 'desktop'] as const) {
    runs.length = 0
    const ui = await $.ui.mount({ ...BAND, surface, props: props() })
    expect((await ui.find({ key: 'model-opus' }))?.props.label).toBe('◉ Opus')
    expect((await ui.find({ key: 'model-sonnet' }))?.props.label).toBe('○ Sonnet')
    expect(await ui.find({ key: 'model-1m' })).toBeUndefined()
    expect(await ui.find({ key: 'model-default' })).toBeUndefined()
    expect(await ui.find({ key: 'model-opusplan' })).toBeUndefined()
    await ui.press({ key: 'model-sonnet' })
    await ui.press({ key: 'model-haiku' })
    await ui.press({ key: 'model-fable' })
    expect(runs).toEqual(['/model sonnet[1m]', '/model haiku', '/model fable[1m]'])
    await ui.unmount()
  }
})

test('effort buttons run /effort', async ($, on) => {
  const { runs } = answer(on, 40)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  await ui.press({ key: 'effort-high' })
  await ui.press({ key: 'effort-max' })
  expect(runs).toEqual(['/effort high', '/effort max'])
  await ui.unmount()
})

test('Handoff: Claude writes the doc, the context is cleared, then Claude reads the doc back', async ($, on) => {
  const seen = answer(on, 60)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })

  await ui.press({ key: 'handoff' })
  await settle()
  expect(seen.prompts[0]).toContain(`write a handoff doc to ${DOC}`)
  expect(seen.writes.map(p => p.replace(/\\/g, '/'))).toContain('Z:/repo/.claude/handoff/.gitignore')
  expect(seen.runs).toEqual([])

  // Claude's turn: it writes the doc.
  seen.docs.push(DOC)
  await turnEnds($)
  await settle()
  expect(seen.runs).toEqual(['/clear '])
  expect(seen.prompts[1]).toContain(`just cleared for a handoff. Read the handoff doc at ${DOC}`)
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).toContain('handoff 3/3')

  // The read-back turn ends the handoff.
  await turnEnds($)
  await settle()
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).not.toContain('handoff 3/3')
  await ui.unmount()
})

test('where /clear is refused, the handoff compacts with the doc named', async ($, on) => {
  const seen = answer(on, 60)
  seen.refused.push('clear')
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  await ui.press({ key: 'handoff' })
  seen.docs.push(DOC)
  await turnEnds($)
  await settle()
  expect(seen.runs.length).toBe(1)
  expect(seen.runs[0]).toContain(`/compact A handoff doc for this session is at ${DOC}`)
  expect(seen.prompts[1]).toContain('just compacted for a handoff')
  await ui.unmount()
})

test('without a doc after two turns, nothing compacts and a toast says so', async ($, on) => {
  const seen = answer(on, 60)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  await ui.press({ key: 'handoff' })
  await turnEnds($)
  await turnEnds($)
  await settle()
  expect(seen.runs).toEqual([])
  expect(seen.toasts.some(t => t.startsWith('No handoff doc at'))).toBe(true)
  await ui.unmount()
})

test("the engine's own compaction waits for a handoff while there is room", async ($, on) => {
  const seen = answer(on, 60)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const held = await $.session.compact({ trigger: 'auto', messages: SUMMARY })
  expect(held.skip).toContain('handoff doc first')
  expect(seen.compactions).toEqual([])
  // The handoff starts when the turn ends.
  await turnEnds($)
  await settle()
  expect(seen.prompts[0]).toContain('write a handoff doc')
})

test("near the hard limit the engine's compaction runs", async ($, on) => {
  const seen = answer(on, 95)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const ran = await $.session.compact({ trigger: 'auto', messages: SUMMARY })
  expect(ran.skip).toBeUndefined()
  expect(seen.compactions).toEqual(['auto'])
})

test('entering the dumb zone queues the handoff for the end of the turn', async ($, on) => {
  const seen = answer(on, 60)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  expect(seen.toasts.some(t => t.includes('writes a handoff doc'))).toBe(true)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).toContain('handoff queued')
  await ui.unmount()
  await turnEnds($)
  await settle()
  expect(seen.prompts[0]).toContain('write a handoff doc')
})

test('a refused command shows a toast instead of failing silently', async ($, on) => {
  const seen = answer(on, 40)
  seen.isBusy = true
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props() })
  await ui.press({ key: 'effort-high' })
  expect(seen.toasts.some(t => t.startsWith('/effort did not run'))).toBe(true)
  await ui.unmount()
})

test('before the dumb zone, or while a turn runs, there is no Handoff button', async ($, on) => {
  answer(on, 45)
  await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true })
  for (const isWorking of [false, true]) {
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: props(isWorking) })
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
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
    expect(await ui.find({ type: 'Text', text: /handoff at 100k · autocompact at 167k/ })).toBeDefined()
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
