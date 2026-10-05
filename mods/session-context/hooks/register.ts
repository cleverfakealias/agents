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

// Every check below runs at once rather than one after another: this runs on each
// typed prompt, and a folder of 15 subfolders was 60 file checks in a row.
async function lockfileIn($: EngineInterface, dir: string): Promise<string | undefined> {
  const found = await Promise.all(LOCKFILES.map(([file]) => $.fs.exists(`${dir}/${file}`).catch(() => false)))
  const i = found.indexOf(true)
  return i < 0 ? undefined : LOCKFILES[i][1]
}

// The package manager at the repo root, or in one folder below it (benhickman.dev/astro).
async function packageManager($: EngineInterface, top: string): Promise<Pm | undefined> {
  const atRoot = await lockfileIn($, top)
  if (atRoot) return { name: atRoot, where: '' }
  const entries = await $.fs.list(top).catch(() => [])
  const dirs = entries.filter(x => x.kind === 'dir' && !SKIP.has(x.name)).slice(0, 15)
  const names = await Promise.all(dirs.map(d => lockfileIn($, `${top}/${d.name}`)))
  const i = names.findIndex(Boolean)
  return i < 0 ? undefined : { name: names[i] as string, where: dirs[i].name }
}

async function specNote($: EngineInterface, top: string): Promise<string | undefined> {
  const entries = await $.fs.list(`${top}/specs`).catch(() => [])
  const found = await Promise.all(
    entries.map(async (entry): Promise<SpecFile | undefined> => {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) return { path: `specs/${entry.name}`, mtimeMs: entry.mtimeMs }
      if (entry.kind !== 'dir') return undefined
      const status = await $.fs.stat(`${top}/specs/${entry.name}/status.md`).catch(() => undefined)
      return status ? { path: `specs/${entry.name}/status.md`, mtimeMs: status.mtimeMs } : undefined
    }),
  )
  const files = found.filter((f): f is SpecFile => f !== undefined)
  const newest = newestSpec(files)
  if (!newest) return undefined
  const text = await $.fs.read(`${top}/${newest.path}`).catch(() => undefined)
  return typeof text === 'string' ? `Latest spec, ${newest.path}:\n${excerpt(text)}` : undefined
}

type Snapshot = { line: string; extra: string[] }

async function snapshot($: EngineInterface, withHistory: boolean): Promise<Snapshot> {
  const cwd = await $.session.cwd()
  // git status works from any folder in the repo, so it need not wait for the top.
  const [top, statusOut] = await Promise.all([
    git($, cwd, ['rev-parse', '--show-toplevel']),
    git($, cwd, ['status', '--porcelain=v2', '--branch']),
  ])
  if (!top) {
    const entries = await $.fs.list(cwd).catch(() => [])
    const dirs = entries.filter(x => x.kind === 'dir' && !x.name.startsWith('.') && !x.name.startsWith('_'))
    const isRepo = await Promise.all(dirs.map(d => $.fs.exists(`${cwd}/${d.name}/.git`).catch(() => false)))
    return { line: notRepoLine(cwd, dirs.filter((_, i) => isRepo[i]).map(d => d.name)), extra: [] }
  }
  const [pm, log, note] = await Promise.all([
    packageManager($, top),
    withHistory ? git($, top, ['log', '-3', '--format=%h %s (%cr)']) : undefined,
    withHistory ? specNote($, top) : undefined,
  ])
  const line = repoLine(top.split('/').pop() ?? top, pm, parseStatus(statusOut ?? ''))
  const extra: string[] = []
  if (log) extra.push(`Recent commits:\n${log}`)
  if (note) extra.push(note)
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
