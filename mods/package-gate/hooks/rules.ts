// Pure parsing for package-gate: which registry packages a command or a manifest
// edit would bring onto this machine, each with a link the user can check.
// Restores of what a lockfile or requirements file already declares pass; new
// names, one-off runners (npx, dlx, uvx) and global installs are asked about.

export type Pkg = { manager: string; name: string; link: string }

// ── tokenizing ────────────────────────────────────────────────────────────────
// The same tokenizer as secret-shield's and repo-lock's.
// Splits a shell command into segments (at && || ; | & ( ) $( ` and newlines
// outside quotes) of whitespace-separated words with their quotes removed. A
// wrapper (time, env, sudo, corepack, ...) is dropped, and the script of a
// `bash -c` or `powershell -Command` is split in turn. Good enough for the
// commands an agent writes; it is a gate on intent, not a shell parser.
const WRAPPERS = new Set(['time', 'nohup', 'exec', 'sudo', 'nice', 'env', 'xargs', 'corepack', 'timeout', 'stdbuf'])
const SHELLS = /^(bash|sh|zsh|dash|cmd|powershell|pwsh)(\.exe)?$/i
const RUN_FLAG = /^(-[a-z]*c|\/c|-command)$/i

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
    } else if (c === '&' && (next === '>' || command[i - 1] === '>' || command[i - 1] === '<')) {
      word += c // 2>&1 and &> are redirects, not separators
      has = true
    } else if (c === '\n' || c === ';' || c === '|' || c === '&' || c === '`') {
      if ((c === '&' || c === '|') && next === c) i++
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

// ── registries ────────────────────────────────────────────────────────────────
const enc = encodeURIComponent
const LINKS: Record<string, (n: string) => string> = {
  npm: n => `https://www.npmjs.com/package/${n}`,
  pypi: n => `https://pypi.org/project/${n}/`,
  crates: n => `https://crates.io/crates/${n}`,
  go: n => `https://pkg.go.dev/${n}`,
  gem: n => `https://rubygems.org/gems/${n}`,
  nuget: n => `https://www.nuget.org/packages/${n}`,
  psgallery: n => `https://www.powershellgallery.com/packages/${n}`,
  winget: n => `https://winstall.app/apps/${n}`,
  choco: n => `https://community.chocolatey.org/packages/${n}`,
  scoop: n => `https://scoop.sh/#/apps?q=${enc(n)}`,
  brew: n => `https://formulae.brew.sh/formula/${n}`,
}

const isUrl = (s: string) => /^(https?:|git\+|git:|github:|ssh:)/.test(s)
const isLocal = (s: string) => /^(\.{1,2}([\\/]|$)|[\\/]|[A-Za-z]:[\\/]|file:|link:|workspace:)/.test(s)

// left-pad@1.3.0 → left-pad, @scope/pkg@^2 → @scope/pkg, npm:alias@x keeps alias target
const npmName = (spec: string) => {
  const s = spec.replace(/^npm:/, '')
  const at = s.indexOf('@', 1)
  return at > 0 ? s.slice(0, at) : s
}
// requests[socks]>=2.0 ; python_version>"3" → requests
const pyName = (spec: string) => spec.split(/[\s;\[<>=!~@]/)[0]
const atName = (spec: string) => spec.split('@')[0]

function pkg(manager: string, registry: string, spec: string, name: string): Pkg {
  return isUrl(spec)
    ? { manager, name: spec, link: spec }
    : { manager, name, link: LINKS[registry](name) }
}

// Flags that take a value, so the value is not mistaken for a package name.
const VALUE_FLAGS = new Set([
  '--prefix', '--registry', '--filter', '-F', '--dir', '-C', '--cache', '--target', '-t',
  '--index-url', '-i', '--extra-index-url', '--find-links', '-f', '--python', '-p',
  '--source', '-s', '--version', '-v', '--scope', '--workspace', '--root', '--path',
  '--constraint', '-c', '--platform', '--only-binary', '--no-binary', '--tag', '--group', '-G',
])

function args(words: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (w.startsWith('-')) {
      if (VALUE_FLAGS.has(w)) i++
      continue
    }
    if (/^(\d*|&)[<>]/.test(w)) {
      if (/^(\d*|&)[<>]{1,2}$/.test(w)) i++ // `> log.txt`: its target too
      continue // 2>&1, >log.txt
    }
    out.push(w)
  }
  return out
}

const hasFlag = (words: string[], ...flags: string[]) => words.some(w => flags.includes(w))

// One segment → the packages it would fetch. `hasLocalBin(name)` says whether a
// runner like npx would use a binary already installed in the project.
export function fromSegment(raw: string[], hasLocalBin: (name: string) => boolean): Pkg[] {
  let w = raw
  while (w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w = w.slice(1) // FOO=1 cmd
  if (w[0] === 'sudo') w = w.slice(1)
  if (!w.length) return []
  const tool = w[0].toLowerCase().replace(/\.(exe|cmd)$/, '').replace(/^.*[\\/]/, '')
  const verb = (w[1] ?? '').toLowerCase()
  const rest = w.slice(2)

  // python -m pip install ... / py -m pip ...
  if (/^(python3?|py)$/.test(tool) && w[1] === '-m' && /^pip3?$/.test(w[2] ?? '')) {
    return fromSegment(['pip', ...w.slice(3)], hasLocalBin)
  }

  switch (tool) {
    case 'npm':
    case 'pnpm':
    case 'yarn':
    case 'bun': {
      // Flags may come before the verb: pnpm --filter web add zod
      const [sub = '', ...specs] = args(w.slice(1))
      const v = sub.toLowerCase()
      if (v === 'dlx') {
        const spec = specs[0]
        return spec ? [pkg(`${tool} dlx`, 'npm', spec, npmName(spec))] : []
      }
      if (v === 'exec' && tool === 'npm') {
        const spec = specs[0]
        return spec && !hasLocalBin(npmName(spec)) ? [pkg('npm exec', 'npm', spec, npmName(spec))] : []
      }
      const adds = tool === 'npm' ? ['install', 'i', 'add', 'isntall', 'in'] : ['add', 'install', 'i']
      if (!adds.includes(v)) return []
      return specs.filter(s => !isLocal(s)).map(s => pkg(`${tool} ${v}`, 'npm', s, npmName(s)))
    }
    case 'npx':
    case 'bunx': {
      if (hasFlag(w, '--no-install', '--no')) return []
      const all = args(w.slice(1))
      const packages = w.flatMap((x, i) => (x === '-p' || x === '--package' ? [w[i + 1]] : []))
      const spec = packages[0] ?? all[0]
      if (!spec || isLocal(spec)) return []
      const name = npmName(spec)
      return hasLocalBin(name) && !packages.length ? [] : [pkg(tool, 'npm', spec, name)]
    }
    case 'pip':
    case 'pip3': {
      if (verb !== 'install') return []
      const specs = args(rest).filter(s => !isLocal(s) && !/\.(txt|whl|tar\.gz|zip)$/.test(s))
      return specs.map(s => pkg('pip install', 'pypi', s, pyName(s)))
    }
    case 'uv': {
      if (verb === 'add' || (verb === 'pip' && w[2] === 'install') || (verb === 'tool' && w[2] === 'install')) {
        const from = verb === 'add' ? rest : w.slice(3)
        return args(from)
          .filter(s => !isLocal(s) && !/\.(txt|whl)$/.test(s))
          .map(s => pkg(`uv ${verb}`, 'pypi', s, pyName(s)))
      }
      if (verb === 'run' && hasFlag(w, '--with')) {
        return w.flatMap((x, i) => (x === '--with' ? [pkg('uv run --with', 'pypi', w[i + 1], pyName(w[i + 1]))] : []))
      }
      return []
    }
    case 'uvx': {
      const spec = args(w.slice(1))[0]
      return spec ? [pkg('uvx', 'pypi', spec, pyName(spec))] : []
    }
    case 'pipx': {
      if (verb !== 'install' && verb !== 'run') return []
      const spec = args(rest)[0]
      return spec ? [pkg(`pipx ${verb}`, 'pypi', spec, pyName(spec))] : []
    }
    case 'poetry':
    case 'pdm':
    case 'conda':
    case 'mamba': {
      const ok = verb === 'add' || (tool !== 'poetry' && tool !== 'pdm' && verb === 'install')
      return ok ? args(rest).filter(s => !isLocal(s)).map(s => pkg(`${tool} ${verb}`, 'pypi', s, pyName(s))) : []
    }
    case 'cargo':
      return verb === 'install' || verb === 'add'
        ? args(rest).filter(s => !isLocal(s)).map(s => pkg(`cargo ${verb}`, 'crates', s, atName(s)))
        : []
    case 'go':
      return verb === 'install' || verb === 'get'
        ? args(rest).filter(s => !isLocal(s)).map(s => pkg(`go ${verb}`, 'go', s, atName(s)))
        : []
    case 'gem':
      return verb === 'install' ? args(rest).map(s => pkg('gem install', 'gem', s, s)) : []
    case 'dotnet':
      return verb === 'add' && w[2] === 'package' && w[3] ? [pkg('dotnet add package', 'nuget', w[3], w[3])] : []
    case 'install-module':
    case 'install-package':
    case 'install-script': {
      const named = w.flatMap((x, i) => (/^-name$/i.test(x) ? [w[i + 1]] : []))
      const names = named.length ? named : args(w.slice(1)).slice(0, 1)
      return names.map(n => pkg(w[0], 'psgallery', n, n))
    }
    case 'winget':
    case 'choco':
    case 'scoop':
    case 'brew': {
      if (verb !== 'install' && verb !== 'upgrade' && verb !== 'add') return []
      const ids = w.flatMap((x, i) => (x === '--id' ? [w[i + 1]] : []))
      const names = ids.length ? ids : args(rest)
      return names.map(n => pkg(`${tool} ${verb}`, tool, n, n))
    }
  }
  return []
}

export function fromCommand(command: string, hasLocalBin: (name: string) => boolean = () => false): Pkg[] {
  const seen = new Set<string>()
  return segments(command)
    .flatMap(s => fromSegment(s, hasLocalBin))
    .filter(p => p.name && !seen.has(`${p.manager}:${p.name}`) && seen.add(`${p.manager}:${p.name}`))
}

// ── manifest edits ────────────────────────────────────────────────────────────
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
const NOT_DEPS = new Set(['name', 'version', 'node', 'npm', 'pnpm', 'yarn', 'bun', 'packageManager', 'type', 'license', 'main', 'module', 'types'])
const VERSIONISH = /^(\^|~|>=?|<=?|=|\*|latest|next|workspace:|npm:|catalog:|\d|git\+|github:|https?:)/

function depKeys(json: string): Set<string> {
  try {
    const p = JSON.parse(json)
    return new Set(DEP_SECTIONS.flatMap(s => Object.keys(p?.[s] ?? {})))
  } catch {
    return new Set()
  }
}
// "left-pad": "^1.3.0" pairs in an Edit fragment (not valid JSON on its own)
function fragmentDeps(text: string): Set<string> {
  const out = new Set<string>()
  for (const m of text.matchAll(/"((?:@[\w.-]+\/)?[\w.-]+)"\s*:\s*"([^"]*)"/g)) {
    if (!NOT_DEPS.has(m[1]) && VERSIONISH.test(m[2])) out.add(m[1])
  }
  return out
}
function reqNames(text: string): Set<string> {
  return new Set(
    text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#') && !l.startsWith('-'))
      .map(l => pyName(l).toLowerCase())
      .filter(Boolean),
  )
}

const base = (p: string) => p.replace(/^.*[\\/]/, '')
export const isManifest = (path: string) => /^package\.json$|^requirements[\w.-]*\.txt$/i.test(base(path))

// Names an edit adds. `before` is the file's current text (undefined when new).
export function fromManifestEdit(path: string, edit: { old?: string; new: string; before?: string; whole: boolean }): Pkg[] {
  const npm = /package\.json$/i.test(base(path))
  let added: string[]
  if (npm) {
    const had = edit.whole ? depKeys(edit.before ?? '{}') : fragmentDeps(edit.old ?? '')
    const has = edit.whole ? depKeys(edit.new) : fragmentDeps(edit.new)
    const known = edit.before ? depKeys(edit.before) : new Set<string>()
    added = [...has].filter(n => !had.has(n) && !known.has(n))
  } else {
    const had = reqNames(edit.whole ? edit.before ?? '' : `${edit.before ?? ''}\n${edit.old ?? ''}`)
    added = [...reqNames(edit.new)].filter(n => !had.has(n))
  }
  return added.map(n => (npm ? pkg('package.json', 'npm', n, n) : pkg(base(path), 'pypi', n, n)))
}
