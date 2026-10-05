import type { EngineInterface, Register } from 'claude-code'

import { type Pkg, fromCommand, fromManifestEdit, isManifest } from './rules'

const INSTALL = 'Install'
const DECLINE = "Don't install"

// Packages the user approved in this session, by "manager:name". A reload asks again.
const approved = new Set<string>()
const key = (p: Pkg) => `${p.manager}:${p.name}`

// Asks the user in Claude Code's own dialog. Answers a deny reason, or undefined
// when every package is approved. Anything but "Install" is a refusal.
async function gate($: EngineInterface, what: string, pkgs: Pkg[]): Promise<string | undefined> {
  const fresh = pkgs.filter(p => !approved.has(key(p)))
  if (!fresh.length) return undefined
  const list = fresh.map(p => `• ${p.name}  (${p.manager})\n  ${p.link}`).join('\n')
  const question = `${what} Check each one first:\n${list}\nInstall ${fresh.length === 1 ? 'it' : 'them'}?`
  let answer = ''
  try {
    answer = await $.ui.ask(question, { header: 'Packages', options: [INSTALL, DECLINE] })
  } catch {
    // dismissed, or nobody to ask (claude -p): treat as not approved
  }
  if (answer === INSTALL) {
    fresh.forEach(p => approved.add(key(p)))
    $.ui.toast(`package-gate: approved ${fresh.map(p => p.name).join(', ')}`)
    return undefined
  }
  const names = fresh.map(p => `${p.name} (${p.link})`).join(', ')
  return answer && answer !== DECLINE
    ? `package-gate: the user did not approve installing ${names}. They answered: "${answer}". Follow that answer.`
    : `package-gate: the user did not approve installing ${names}. Do not install it another way. ` +
        'Tell the user why you wanted it and what you can do without it.'
}

// Runners like npx use the project's own copy when one is installed.
async function localBins($: EngineInterface, command: string): Promise<(name: string) => boolean> {
  const found = new Set<string>()
  try {
    const cwd = await $.session.cwd()
    for (const m of command.matchAll(/\b(?:npx|bunx|npm\s+exec)\s+(?:-\S+\s+)*((?:@[\w.-]+\/)?[\w.-]+)/g)) {
      const bin = m[1].replace(/^@[\w.-]+\//, '')
      if (await $.fs.exists(`${cwd}/node_modules/.bin/${bin}`)) found.add(m[1])
    }
  } catch {
    // no file system here: assume nothing is installed, so the user is asked
  }
  return name => found.has(name)
}

async function manifestDeny($: EngineInterface, path: string, edit: { old?: string; new: string; whole: boolean }) {
  if (!isManifest(path)) return undefined
  const before = await $.fs.read(path).catch(() => undefined)
  const pkgs = fromManifestEdit(path, { ...edit, before: typeof before === 'string' ? before : undefined })
  return pkgs.length ? gate($, `Claude wants to add dependencies to ${path}.`, pkgs) : undefined
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const pkgs = fromCommand(e.command, await localBins($, e.command))
    const deny = pkgs.length ? await gate($, 'Claude wants to install packages on this machine.', pkgs) : undefined
    return deny ? { deny } : next(e)
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const pkgs = fromCommand(e.command, await localBins($, e.command))
    const deny = pkgs.length ? await gate($, 'Claude wants to install packages on this machine.', pkgs) : undefined
    return deny ? { deny } : next(e)
  })

  // The side door: add a dependency to a manifest, then run a plain install.
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await manifestDeny($, e.file_path, { old: e.old_string, new: e.new_string, whole: false })
    return deny ? { deny } : next(e)
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const deny = await manifestDeny($, e.file_path, { new: e.content, whole: true })
    return deny ? { deny } : next(e)
  })
}
