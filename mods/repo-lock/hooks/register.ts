import type { EngineInterface, Register } from 'claude-code'

import { LOCKFILES, type Pm, ancestors, join, pmCalls, verdict, winPath } from './rules'

// The nearest lockfile at or above `dir` names the package manager.
async function repoPm($: EngineInterface, dir: string): Promise<Pm | undefined> {
  for (const folder of ancestors(dir)) {
    for (const [file, pm] of LOCKFILES) {
      if (await $.fs.exists(`${folder}/${file}`).catch(() => false)) return pm
    }
  }
  return undefined
}

async function run($: EngineInterface, argv: string[], cwd: string): Promise<string> {
  try {
    const r = await $.process.run(argv, { cwd, timeoutMs: 10000 })
    return r.exitCode === 0 ? r.stdout.trim() : ''
  } catch {
    return ''
  }
}

// Status line: repo · package manager · branch
async function showStatus($: EngineInterface, dir: string) {
  const top = await run($, ['git', 'rev-parse', '--show-toplevel'], dir)
  if (!top) {
    $.ui.status(`${winPath(dir).split('/').pop()} · not a repo`)
    return
  }
  const branch = await run($, ['git', 'rev-parse', '--abbrev-ref', 'HEAD'], dir)
  const pm = await repoPm($, dir)
  $.ui.status([top.split('/').pop(), pm ?? 'no lockfile', branch].filter(Boolean).join(' · '))
}

async function guard($: EngineInterface, command: string): Promise<string | undefined> {
  const { cd, calls } = pmCalls(command)
  if (!calls.length) return undefined
  const cwd = await $.session.cwd()
  const base = cd === undefined ? cwd : join(cwd, cd)
  for (const call of calls) {
    const dir = call.subdir ? join(base, call.subdir) : base
    const reason = verdict(call, await repoPm($, dir), winPath(dir))
    if (reason) return reason
  }
  return undefined
}

async function afterCommand($: EngineInterface, command: string) {
  if (/\b(cd|set-location|git\s+(checkout|switch|worktree)|pushd|popd)\b/i.test(command)) {
    await showStatus($, await $.session.cwd())
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await showStatus($, e.cwd)
    return result
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const deny = await guard($, e.command)
    if (deny) return { deny }
    const result = await next(e)
    await afterCommand($, e.command)
    return result
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const deny = await guard($, e.command)
    if (deny) return { deny }
    const result = await next(e)
    await afterCommand($, e.command)
    return result
  })
}
