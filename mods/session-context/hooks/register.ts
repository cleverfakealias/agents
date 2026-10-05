import type { EngineInterface, Register } from 'claude-code'

import { type Pm, type SpecFile, excerpt, newestSpec, notRepoLine, parseStatus, repoLine } from './rules'

const LOCKFILES: [string, string][] = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['package-lock.json', 'npm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
]
const SKIP = new Set(['node_modules', '.git', '.claude', 'dist', '.astro', '.wrangler'])

// What Claude last read, so an unchanged repo line is not sent again.
let lastLine = ''
let isFirstPrompt = true

async function git($: EngineInterface, cwd: string, args: string[]): Promise<string | undefined> {
  try {
    const r = await $.process.run(['git', ...args], { cwd, timeoutMs: 8000 })
    return r.exitCode === 0 ? r.stdout.trim() : undefined
  } catch {
    return undefined
  }
}

async function lockfileIn($: EngineInterface, dir: string): Promise<string | undefined> {
  for (const [file, name] of LOCKFILES) {
    if (await $.fs.exists(`${dir}/${file}`).catch(() => false)) return name
  }
  return undefined
}

// The package manager at the repo root, or in one folder below it (benhickman.dev/astro).
async function packageManager($: EngineInterface, top: string): Promise<Pm | undefined> {
  const atRoot = await lockfileIn($, top)
  if (atRoot) return { name: atRoot, where: '' }
  const entries = await $.fs.list(top).catch(() => [])
  for (const entry of entries.filter(x => x.kind === 'dir' && !SKIP.has(x.name)).slice(0, 15)) {
    const name = await lockfileIn($, `${top}/${entry.name}`)
    if (name) return { name, where: entry.name }
  }
  return undefined
}

async function specNote($: EngineInterface, top: string): Promise<string | undefined> {
  const entries = await $.fs.list(`${top}/specs`).catch(() => [])
  const files: SpecFile[] = []
  for (const entry of entries) {
    if (entry.kind === 'file' && entry.name.endsWith('.md')) files.push({ path: `specs/${entry.name}`, mtimeMs: entry.mtimeMs })
    if (entry.kind === 'dir') {
      const status = await $.fs.stat(`${top}/specs/${entry.name}/status.md`).catch(() => undefined)
      if (status) files.push({ path: `specs/${entry.name}/status.md`, mtimeMs: status.mtimeMs })
    }
  }
  const newest = newestSpec(files)
  if (!newest) return undefined
  const text = await $.fs.read(`${top}/${newest.path}`).catch(() => undefined)
  return typeof text === 'string' ? `Latest spec, ${newest.path}:\n${excerpt(text)}` : undefined
}

type Snapshot = { line: string; extra: string[] }

async function snapshot($: EngineInterface, withHistory: boolean): Promise<Snapshot> {
  const cwd = await $.session.cwd()
  const top = await git($, cwd, ['rev-parse', '--show-toplevel'])
  if (!top) {
    const entries = await $.fs.list(cwd).catch(() => [])
    const repos: string[] = []
    for (const entry of entries.filter(x => x.kind === 'dir' && !x.name.startsWith('.') && !x.name.startsWith('_'))) {
      if (await $.fs.exists(`${cwd}/${entry.name}/.git`).catch(() => false)) repos.push(entry.name)
    }
    return { line: notRepoLine(cwd, repos), extra: [] }
  }
  const status = parseStatus((await git($, top, ['status', '--porcelain=v2', '--branch'])) ?? '')
  const line = repoLine(top.split('/').pop() ?? top, await packageManager($, top), status)
  const extra: string[] = []
  if (withHistory) {
    const log = await git($, top, ['log', '-3', '--format=%h %s (%cr)'])
    if (log) extra.push(`Recent commits:\n${log}`)
    const note = await specNote($, top)
    if (note) extra.push(note)
  }
  return { line, extra }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'where',
      description: 'Show the repo, branch, uncommitted work, recent commits and latest spec for this session',
    })
    return next(e)
  })

  on('command.run', { command: 'where' }, async $ => {
    const s = await snapshot($, true)
    return { text: [s.line, ...s.extra].join('\n\n') }
  })

  // Typed prompts (and Remote Control ones) get the repo line when it changed,
  // and the first prompt also gets recent commits and the latest spec note.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind !== 'composer' && e.origin.kind !== 'bridge') return next(e)
    const s = await snapshot($, isFirstPrompt).catch(() => undefined)
    if (!s) return next(e)
    const blocks = [s.line !== lastLine ? s.line : '', ...s.extra].filter(Boolean)
    isFirstPrompt = false
    lastLine = s.line
    if (!blocks.length) return next(e)
    return next({ ...e, context: [...(e.context ?? []), `session-context:\n${blocks.join('\n\n')}`] })
  })
}
