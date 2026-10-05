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

// Words of each segment of a shell command, split at && || ; | and newlines.
export function segments(command: string): string[][] {
  const out: string[][] = []
  let words: string[] = []
  let word = ''
  let quote: string | null = null
  let has = false
  const endWord = () => {
    if (has) words.push(word)
    word = ''
    has = false
  }
  const endSegment = () => {
    endWord()
    if (words.length) out.push(words)
    words = []
  }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]
    if (quote) {
      if (c === quote) quote = null
      else word += c
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      has = true
    } else if (c === '\n' || c === ';' || c === '|' || (c === '&' && command[i + 1] === '&')) {
      if (c === '&' || (c === '|' && command[i + 1] === '|')) i++
      endSegment()
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
