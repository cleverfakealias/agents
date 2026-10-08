import type { RenderPropsOf } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const props: RenderPropsOf['AbovePrompt'] = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 30,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 29 },
  view: {},
}
const BAND = { plugin: 'repo-lock', component: 'AbovePrompt' } as const

test('the Desktop Code tab gets the status line as a band row; the terminal keeps its status line', async ($, on) => {
  const statuses: string[] = []
  on('session.start', (_eng, e) => ({ cwd: e.cwd }))
  on('fs.exists', (_eng, e) => ({ value: e.path.replace(/\\/g, '/') === 'Z:/r/pnpm-lock.yaml' }))
  on('ui.status', (_eng, e) => {
    if (e.text) statuses.push(e.text)
    return { value: undefined }
  })
  on('process.run', () => ({
    value: { exitCode: 0, stdout: 'Z:/r\nmain\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('ui.render', (eng, e) => {
    const { Box } = eng.ui.resolve(e)
    return <Box />
  })

  await $.session.start({ cwd: 'Z:/r', surface: 'desktop', isInteractive: true })
  expect(statuses).toEqual(['r · pnpm · main'])

  const desk = await $.ui.mount({ ...BAND, surface: 'desktop', props })
  expect(await desk.find({ type: 'Text', text: /^r · pnpm · main$/ })).toBeDefined()
  await desk.unmount()

  const term = await $.ui.mount({ ...BAND, surface: 'terminal', props })
  expect(await term.find({ type: 'Text', text: /pnpm/ })).toBeUndefined()
  await term.unmount()
})
