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
