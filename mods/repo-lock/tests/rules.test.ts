import { describe, expect, test } from 'claude-code/testing'

import { ancestors, join, pmCalls, verdict } from '../hooks/rules'

const first = (command: string) => pmCalls(command).calls[0]

describe('pmCalls', () => {
  test('finds dependency-changing calls and the leading cd', () => {
    const r = pmCalls('cd /z/github_projects/snow-removal && pnpm install')
    expect(r.cd).toBe('/z/github_projects/snow-removal')
    expect(r.calls).toEqual([{ pm: 'pnpm', verb: 'install', subdir: undefined, isGlobal: false }])
  })
  test('reads --prefix and flags before the verb', () => {
    expect(first('npm --prefix astro install')?.subdir).toBe('astro')
    expect(first('pnpm --filter web add zod')?.verb).toBe('add')
  })
  test('ignores scripts and read-only commands', () => {
    expect(pmCalls('npm run build && pnpm test && npm ls').calls).toEqual([])
    expect(pmCalls('pnpm exec prettier --check .').calls).toEqual([])
  })
  test('marks global installs', () => {
    expect(first('npm i -g wrangler')?.isGlobal).toBe(true)
  })
  test('finds calls inside wrappers, subshells and bash -c', () => {
    expect(first('time npm install')?.pm).toBe('npm')
    expect(first('corepack yarn add zod')?.pm).toBe('yarn')
    expect(first("bash -c 'npm i zod'")?.verb).toBe('i')
    expect(pmCalls('(cd web && npm i zod)')).toEqual({ cd: 'web', calls: [{ pm: 'npm', verb: 'i', subdir: undefined, isGlobal: false }] })
  })
  test('heredoc bodies are not commands', () => {
    expect(pmCalls("cat > bench.mjs <<'EOF'\nconst re = /\\b(npm|pnpm|yarn|bun)\\s+install/\nEOF").calls).toEqual([])
  })
  test('checking that a tool exists is not an install', () => {
    expect(pmCalls('command -v yarn && yarn --version').calls).toEqual([])
  })
})

describe('verdict', () => {
  const npmInstall = { pm: 'npm' as const, verb: 'install', isGlobal: false }
  test('mismatch is denied with the right manager named', () => {
    expect(verdict(npmInstall, 'pnpm', 'Z:/github_projects/zennlogic.com')).toContain('Use pnpm')
  })
  test('no lockfile anywhere is denied', () => {
    expect(verdict(npmInstall, undefined, 'Z:/github_projects')).toContain('absolute cd')
  })
  test('a match passes', () => {
    expect(verdict(npmInstall, 'npm', 'Z:/github_projects/snow-removal')).toBeUndefined()
  })
})

describe('paths', () => {
  test('msys paths become Windows paths', () => {
    expect(join('Z:/github_projects', '/z/github_projects/agents')).toBe('Z:/github_projects/agents')
    expect(join('Z:\\github_projects', 'agents')).toBe('Z:/github_projects/agents')
  })
  test('ancestors stop above the drive root', () => {
    expect(ancestors('Z:/github_projects/benhickman.dev/astro')).toEqual([
      'Z:/github_projects/benhickman.dev/astro',
      'Z:/github_projects/benhickman.dev',
      'Z:/github_projects',
    ])
  })
})
