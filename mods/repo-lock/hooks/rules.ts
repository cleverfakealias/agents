// Pure rules for repo-lock: which package manager a folder uses, and whether a
// command would change dependencies with a different one, or from a folder that
// is not a project at all (the parent Z:\github_projects, for example).

export type Pm = 'npm' | 'pnpm' | 'yarn' | 'bun'

export const LOCKFILES: [string, Pm][] = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['package-lock.json', 'npm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
]

// The same tokenizer as package-gate's and secret-shield's.
// Splits a shell command into segments (at && || ; | & ( ) $( ` and newlines
// outside quotes) of whitespace-separated words with their quotes removed. A
// wrapper (time, env, sudo, corepack, ...) is dropped, and the script of a
// `bash -c` or `powershell -Command` is split in turn. Good enough for the
// commands an agent writes; it is a gate on intent, not a shell parser.
const WRAPPERS = new Set(['time', 'nohup', 'exec', 'sudo', 'nice', 'env', 'xargs', 'corepack', 'timeout', 'stdbuf'])
const SHELLS = /^(bash|sh|zsh|dash|cmd|powershell|pwsh)(\.exe)?$/i
const RUN_FLAG = /^(-[a-z]*c|\/c|-command)$/i
const HEREDOC = /<<-?[ \t]*(['"]?)([\w.-]+)\1/y

function expand(words: string[]): string[][] {
  let w = words.filter(x => x !== '{' && x !== '}')
  while (w.length > 1) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w = w.slice(1) // FOO=1 cmd
    else if (w[0].startsWith('$') && w[1] === '=') w = w.slice(2) // $x = cmd
    else if (WRAPPERS.has(w[0].toLowerCase())) {
      w = w.slice(1)
      while (w.length > 1 && /^-|^\d+[smhd]?$/.test(w[0])) w = w.slice(1) // sudo -E, timeout 30
    } else break
  }
  const run = w.findIndex(x => RUN_FLAG.test(x))
  if (w.length && SHELLS.test(w[0]) && run > 0 && run < w.length - 1) return segments(w.slice(run + 1).join(' '))
  return w.length ? [w] : []
}

export function segments(command: string): string[][] {
  const out: string[][] = []
  let words: string[] = []
  let word = ''
  let quote: string | null = null
  let has = false
  const subs: (string | null)[] = [] // the quote each open ( or $( returns to at its )
  let bodies: string[] = [] // heredoc end tags whose bodies start at the next newline
  // A heredoc body is data (cat > notes.md <<EOF): skip to the line after its end tag.
  const skipBodies = (at: number) => {
    for (const tag of bodies) {
      while (at < command.length) {
        const end = command.indexOf('\n', at + 1)
        const line = command.slice(at + 1, end < 0 ? command.length : end)
        at = end < 0 ? command.length : end
        if (line.trim() === tag) break
      }
    }
    bodies = []
    return at
  }
  const endWord = () => {
    if (has) words.push(word)
    word = ''
    has = false
  }
  const endSegment = () => {
    endWord()
    if (words.length) out.push(...expand(words))
    words = []
  }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]
    const next = command[i + 1]
    if (quote === '"' && c === '$' && next === '(') {
      endSegment() // "$(cat x)" still runs cat x
      subs.push(quote)
      quote = null
      i++
    } else if (quote) {
      if (c === quote) quote = null
      else word += c
    } else if (c === '"' || c === "'") {
      quote = c
      has = true
    } else if (c === '(' || (c === '$' && next === '(')) {
      if (c === '$') i++
      endSegment()
      subs.push(null)
    } else if (c === ')') {
      endSegment()
      quote = subs.pop() ?? null
    } else if (c === '<' && next === '<') {
      HEREDOC.lastIndex = i
      const m = command[i + 2] === '<' ? null : HEREDOC.exec(command)
      if (m) {
        endWord()
        if (!SHELLS.test(words[0] ?? '')) bodies.push(m[2]) // bash <<EOF runs its body: read it
        i = HEREDOC.lastIndex - 1
      } else {
        while (command[i + 1] === '<') word += command[i++] // <<< here-string
        word += c
        has = true
      }
    } else if (c === '&' && (next === '>' || command[i - 1] === '>' || command[i - 1] === '<')) {
      word += c // 2>&1 and &> are redirects, not separators
      has = true
    } else if (c === '\n' || c === ';' || c === '|' || c === '&' || c === '`') {
      if ((c === '&' || c === '|') && next === c) i++
      endSegment()
      if (c === '\n' && bodies.length) i = skipBodies(i)
    } else if (/\s/.test(c)) {
      endWord()
    } else {
      word += c
      has = true
    }
  }
  endSegment()
  return out
}

// /z/github_projects/x → Z:/github_projects/x
export const winPath = (p: string) =>
  p.replace(/^\/([a-zA-Z])(\/|$)/, (_, d: string) => `${d.toUpperCase()}:/`).replace(/\\/g, '/')

export const join = (dir: string, rel: string) =>
  /^[A-Za-z]:\//.test(winPath(rel)) ? winPath(rel) : `${winPath(dir).replace(/\/$/, '')}/${winPath(rel)}`

// Folders from `dir` up to the drive root.
export function ancestors(dir: string): string[] {
  const parts = winPath(dir).replace(/\/$/, '').split('/')
  return parts.map((_, i) => parts.slice(0, parts.length - i).join('/')).filter(p => p && !/^[A-Za-z]:$/.test(p))
}

const MUTATING: Record<Pm, string[]> = {
  npm: ['install', 'i', 'in', 'isntall', 'add', 'ci', 'uninstall', 'remove', 'rm', 'un', 'update', 'up', 'upgrade', 'dedupe', 'prune'],
  pnpm: ['install', 'i', 'add', 'remove', 'rm', 'uninstall', 'un', 'update', 'up', 'upgrade', 'dedupe', 'prune', 'import'],
  yarn: ['install', 'add', 'remove', 'upgrade', 'up', 'dedupe'],
  bun: ['install', 'i', 'add', 'remove', 'rm', 'update', 'upgrade'],
}
const DIR_FLAGS = new Set(['--prefix', '-C', '--dir', '--cwd'])

export type PmCall = { pm: Pm; verb: string; subdir?: string; isGlobal: boolean }

// The dependency-changing package manager calls in a command, and the leading
// `cd` that sets where they run.
export function pmCalls(command: string): { cd?: string; calls: PmCall[] } {
  const segs = segments(command)
  let cd: string | undefined
  const calls: PmCall[] = []
  for (const words of segs) {
    const tool = words[0].toLowerCase().replace(/\.(exe|cmd)$/, '')
    if (/^(cd|set-location|pushd|sl)$/.test(tool) && words[1]) {
      cd = cd === undefined ? words[1] : join(cd, words[1])
      continue
    }
    if (!(tool in MUTATING)) continue
    const pm = tool as Pm
    let subdir: string | undefined
    let verb: string | undefined
    for (let i = 1; i < words.length; i++) {
      const w = words[i]
      if (DIR_FLAGS.has(w)) subdir = words[++i]
      else if (w.startsWith('--prefix=') || w.startsWith('--dir=')) subdir = w.split('=')[1]
      else if (w === '--filter' || w === '-F' || w === '-w' || w === '--workspace') i += w === '-w' && pm === 'pnpm' ? 0 : 1
      else if (!w.startsWith('-') && verb === undefined) verb = w.toLowerCase()
    }
    // a bare `yarn` or `bun` is an install
    if (verb === undefined && (pm === 'yarn' || pm === 'bun') && words.length === 1) verb = 'install'
    if (verb && MUTATING[pm].includes(verb)) {
      calls.push({ pm, verb, subdir, isGlobal: words.includes('-g') || words.includes('--global') })
    }
  }
  return { cd, calls }
}

export function verdict(call: PmCall, repoPm: Pm | undefined, dir: string): string | undefined {
  if (call.isGlobal) return undefined // package-gate asks about global installs
  if (repoPm === undefined) {
    return (
      `repo-lock: ${dir} has no lockfile in it or above it, so "${call.pm} ${call.verb}" would start a new ` +
      'dependency tree in the wrong place. Start the command with an absolute cd into the repo, ' +
      'for example: cd /z/github_projects/<repo> && ...'
    )
  }
  if (repoPm !== call.pm) {
    return (
      `repo-lock: ${dir} uses ${repoPm} (its lockfile says so). "${call.pm} ${call.verb}" would write a second ` +
      `lockfile and a different node_modules layout. Use ${repoPm} instead.`
    )
  }
  return undefined
}
