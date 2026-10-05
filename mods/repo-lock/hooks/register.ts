import type { EngineInterface, Register } from 'claude-code'

import { CHANGES_BRANCH, LOCKFILES, type Pm, ancestors, join, pmCalls, verdict, winPath } from './rules'

// The nearest lockfile at or above `dir` names the package manager. A folder's
// lockfiles are checked at once, nearest folder first.
async function repoPm($: EngineInterface, dir: string): Promise<Pm | undefined> {
  for (const folder of ancestors(dir)) {
    const found = await Promise.all(LOCKFILES.map(([file]) => $.fs.exists(`${folder}/${file}`).catch(() => false)))
    const i = found.indexOf(true)
    if (i >= 0) return LOCKFILES[i][1]
  }
  return undefined
}

// The folder the status line shows. A reload clears it, so the next command redraws.
let shownFor: string | undefined

// Status line: repo · package manager · branch. One git call answers the first
// and last; in a repo with no commits it exits 128 but still prints both.
async function showStatus($: EngineInterface, dir: string) {
  shownFor = dir
  const r = await $.process.run(['git', 'rev-parse', '--show-toplevel', '--abbrev-ref', 'HEAD'], { cwd: dir, timeoutMs: 10000 }).catch(() => undefined)
  const [top, branch] = (r?.stdout ?? '').trim().split(/\r?\n/)
  if (!top) {
    $.ui.status(`${winPath(dir).split('/').pop()} · not a repo`)
    return
  }
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

// Redraw only when what the line shows can have changed: the folder, the branch,
// or the lockfile. Most commands start with `cd`, so matching cd redrew every time.
async function afterCommand($: EngineInterface, command: string) {
  const dir = await $.session.cwd()
  if (dir !== shownFor || CHANGES_BRANCH.test(command) || pmCalls(command).calls.length) await showStatus($, dir)
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
