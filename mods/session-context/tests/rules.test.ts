import { describe, expect, test } from 'claude-code/testing'

import { excerpt, newestSpec, notRepoLine, parseStatus, repoLine } from '../hooks/rules'

const STATUS = [
  '# branch.oid 1c0920c',
  '# branch.head main',
  '# branch.upstream origin/main',
  '# branch.ab +2 -0',
  '1 .M N... 100644 100644 100644 a b .dev.vars.example',
  '1 M. N... 100644 100644 100644 a b src/a.ts',
  '? drafts/',
].join('\n')

describe('repo line', () => {
  test('summarizes branch, work and upstream', () => {
    const s = parseStatus(STATUS)
    expect(s).toEqual({ branch: 'main', hasUpstream: true, ahead: 2, behind: 0, changed: 2, untracked: 1 })
    expect(repoLine('zennlogic.com', { name: 'pnpm', where: '' }, s)).toBe(
      'Repo zennlogic.com (pnpm) · branch main · 2 changed, 1 untracked · 2 ahead of upstream',
    )
  })
  test('names a package manager in a subfolder and a missing upstream', () => {
    const s = parseStatus('# branch.head chore/agent-scaffold\n')
    expect(repoLine('benhickman.dev', { name: 'pnpm', where: 'astro' }, s)).toBe(
      'Repo benhickman.dev (pnpm in astro/) · branch chore/agent-scaffold · clean · no upstream',
    )
  })
  test('the parent folder lists its repos and the cd rule', () => {
    const line = notRepoLine('Z:\\github_projects', ['agents', 'zennlogic.com'])
    expect(line).toContain('not a git repo')
    expect(line).toContain('agents, zennlogic.com')
    expect(line).toContain('absolute cd')
  })
})

describe('spec note', () => {
  test('picks the newest status file', () => {
    expect(newestSpec([{ path: 'specs/a.md', mtimeMs: 1 }, { path: 'specs/b/status.md', mtimeMs: 5 }])?.path).toBe('specs/b/status.md')
    expect(newestSpec([])).toBeUndefined()
  })
  test('excerpt drops front matter and blank lines and caps the length', () => {
    const text = '---\ntitle: x\n---\n\n# Status\n\n' + Array.from({ length: 20 }, (_, i) => `- item ${i}`).join('\n')
    const out = excerpt(text, 3)
    expect(out).toBe('# Status\n- item 0\n- item 1\n...')
  })
})

test('/where runs its git and file checks at once, not one after another', async ($, on) => {
  let inFlight = 0
  let most = 0
  const answers: Record<string, string> = {
    'rev-parse': 'Z:/r',
    status: '# branch.head main\n# branch.upstream origin/main\n# branch.ab +0 -0\n',
    log: 'abc1234 fix: a thing (2 hours ago)',
  }
  on('session.cwd', () => ({ value: 'Z:/r' }))
  on('fs.exists', (_, e) => ({ value: e.path.replace(/\\/g, '/') === 'Z:/r/web/pnpm-lock.yaml' }))
  on('fs.list', (_, e) =>
    ({ value: e.path.replace(/\\/g, '/') === 'Z:/r' ? ['api', 'docs', 'web'].map(name => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })) : [] }),
  )
  on('process.run', async (_, e) => {
    inFlight++
    most = Math.max(most, inFlight)
    for (let k = 0; k < 50; k++) await Promise.resolve()
    inFlight--
    return { value: { exitCode: 0, stdout: answers[e.argv[1]] ?? '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  const { text } = await $.command.run({ command: 'where', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } })
  expect(text).toContain('Repo r (pnpm in web/) · branch main · clean')
  expect(text).toContain('abc1234 fix: a thing')
  expect(most).toBeGreaterThan(1)
})
