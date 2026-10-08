import type { EngineInterface, Register } from 'claude-code'

import { MARK, addsMark, envDump, isSecretFile, redact, shellRead } from './rules'
import { segments } from './shell'

const READ_DENY = (file: string) =>
  `secret-shield: ${file} holds secrets, so its contents stay out of the transcript. ` +
  'If you need a value, ask the user. If you need the variable names, read the .example or .template file.'
const MARK_DENY = (file: string) =>
  `secret-shield: this edit would write "${MARK}" into ${file}. The marker stands in for a value you never saw, ` +
  'so writing it would destroy that value. Edit only the lines you need and leave redacted lines as they are. ' +
  'If the file really needs the marker text, ask the user.'

// /z/github_projects/x → Z:/github_projects/x, so git gets a path Windows knows.
const winPath = (p: string) => p.replace(/^\/([a-zA-Z])(\/|$)/, (_, d: string) => `${d.toUpperCase()}:/`)

// The folder a command runs in: its leading `cd X`, else the session's.
async function commandDir($: EngineInterface, command: string): Promise<string> {
  const cwd = await $.session.cwd()
  const first = segments(command)[0] ?? []
  if (/^(cd|set-location|pushd)$/i.test(first[0] ?? '') && first[1]) {
    const target = winPath(first[1])
    return /^[A-Za-z]:[\\/]/.test(target) || target.startsWith('/') ? target : `${cwd}/${target}`
  }
  return cwd
}

async function git($: EngineInterface, dir: string, args: string[]): Promise<string | undefined> {
  try {
    const r = await $.process.run(['git', ...args], { cwd: dir, timeoutMs: 15000 })
    return r.exitCode === 0 ? r.stdout : undefined
  } catch {
    return undefined
  }
}

// Before git add -A / git add . : untracked secret files that .gitignore misses.
// Before git push: secret files inside the commits about to leave.
async function gitGuard($: EngineInterface, command: string): Promise<string | undefined> {
  const words = segments(command).find(w => w[0] === 'git' && (w[1] === 'add' || w[1] === 'push'))
  if (!words) return undefined
  const dir = await commandDir($, command)

  if (words[1] === 'add' && words.slice(2).some(w => w === '-A' || w === '--all' || w === '.' || w === '-u')) {
    const status = await git($, dir, ['status', '--porcelain', '--untracked-files=all'])
    const risky = (status ?? '')
      .split('\n')
      .filter(l => l.startsWith('??'))
      .map(l => l.slice(3).trim())
      .filter(isSecretFile)
    if (risky.length) {
      return `secret-shield: ${risky.join(', ')} would be staged, and ${risky.length === 1 ? 'it looks' : 'they look'} like secrets. ` +
        'Add them to .gitignore first, or stage files by name.'
    }
  }
  if (words[1] === 'push') {
    const files =
      (await git($, dir, ['log', '@{u}..HEAD', '--name-only', '--format='])) ??
      (await git($, dir, ['log', 'origin/HEAD..HEAD', '--name-only', '--format=']))
    const risky = [...new Set((files ?? '').split('\n').map(l => l.trim()).filter(isSecretFile))]
    if (risky.length) {
      return `secret-shield: the commits to push touch ${risky.join(', ')}, which look like secrets. ` +
        'Stop and show the user. Do not push until they decide.'
    }
  }
  return undefined
}

async function shellGuard($: EngineInterface, command: string): Promise<string | undefined> {
  const file = shellRead(command)
  if (file) return READ_DENY(file)
  if (envDump(command)) {
    return 'secret-shield: dumping every environment variable would print secrets. Read the one variable you need by name.'
  }
  return gitGuard($, command)
}

// If a guard throws or times out, the engine would skip it and run the call.
// Fail closed when the command names anything secret-shaped; let the rest through.
const MENTIONS_SECRET = /\.env\b|\.dev\.vars|tokens?\.json|credentials|\.pem\b|\.key\b|id_(rsa|ed25519)|printenv|env:|git\s+(add|push)/i
const FAILED = 'secret-shield could not check this command, so it did not run. Run a narrower command, or ask the user.'
const UNSCANNED = 'secret-shield could not scan this tool output for secrets, so it hid all of it. Rerun with less output (head, a filter, a smaller file).'

export const register: Register = on => {
  on('tool.call', { tool: 'Read' }, ($, e, next) =>
    isSecretFile(e.file_path) ? { deny: READ_DENY(e.file_path) } : next(e),
  )

  // What Claude read may hold MARK in place of a value: don't let it write that back.
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    if (!e.content.includes(MARK)) return next(e)
    const before = await $.fs.read(e.file_path).catch(() => undefined)
    return addsMark(typeof before === 'string' ? before : '', e.content) ? { deny: MARK_DENY(e.file_path) } : next(e)
  })

  on('tool.call', { tool: 'Edit' }, ($, e, next) =>
    addsMark(e.old_string, e.new_string) ? { deny: MARK_DENY(e.file_path) } : next(e),
  )

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const deny = await shellGuard($, e.command)
    return deny ? { deny } : next(e)
  }).catch(($, e, next) => (MENTIONS_SECRET.test(e.command) ? { deny: FAILED } : next(e)))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const deny = await shellGuard($, e.command)
    return deny ? { deny } : next(e)
  }).catch(($, e, next) => (MENTIONS_SECRET.test(e.command) ? { deny: FAILED } : next(e)))

  // Scrub token shapes from tool output before the transcript keeps it. The
  // stored row is also what the model reads, so the value never reaches it.
  on('session.append', { door: 'tool-result' }, async ($, e, next) => {
    let total = 0
    const scrub = (text: string) => {
      const r = redact(text)
      total += r.count
      return r.text
    }
    const content = e.message.content.map(block => {
      if (block.type === 'text' && typeof block.text === 'string') return { ...block, text: scrub(block.text) }
      if (block.type !== 'tool_result') return block
      const inner = block.content
      if (typeof inner === 'string') return { ...block, content: scrub(inner) }
      if (!Array.isArray(inner)) return block
      return { ...block, content: inner.map(c => (c.type === 'text' ? { ...c, text: scrub(c.text) } : c)) }
    })
    if (!total) return next(e)
    // The engine already heads a toast with the plugin's name.
    $.ui.toast(`Hid ${total} secret value${total === 1 ? '' : 's'} in a tool result`)
    return next({ ...e, message: { ...e.message, content } })
  }).catch(($, e, next) => {
    // Skipped, this hook would store the output unscanned: hide all of it instead.
    const content = e.message.content.map(block => {
      if (block.type === 'text') return { ...block, text: UNSCANNED }
      return block.type === 'tool_result' ? { ...block, content: UNSCANNED } : block
    })
    return next({ ...e, message: { ...e.message, content } })
  })
}
