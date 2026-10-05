// Pure rules for secret-shield. Permission deny rules cover Claude's Read tool,
// not the shell, so a `head tokens.json` once printed live tokens into a
// transcript. These rules close that gap and scrub token shapes from tool output.

// ── secret files ──────────────────────────────────────────────────────────────
const SECRET_FILE =
  /^(\.env(\..+)?|\.envrc|\.dev\.vars(\..+)?|tokens?\.json|\.?credentials(\.json)?|\.git-credentials|secrets?\.(json|ya?ml|toml)|service[-_]account.*\.json|.+\.(pem|key|p12|pfx)|id_(rsa|ed25519|ecdsa|dsa)|\.netrc|\.pypirc)$/i
const TEMPLATE = /\.(example|sample|template|dist|defaults)$/i

const base = (p: string) => p.replace(/^.*[\\/]/, '').replace(/^['"]|['"]$/g, '')
export const isSecretFile = (path: string) => SECRET_FILE.test(base(path)) && !TEMPLATE.test(base(path))

// ── shell reads ───────────────────────────────────────────────────────────────
const READERS = new Set([
  'cat', 'head', 'tail', 'less', 'more', 'bat', 'type', 'nl', 'od', 'xxd', 'hexdump', 'strings', 'base64',
  'sed', 'awk', 'sort', 'uniq', 'cut', 'tac', 'source', '.', 'cp', 'scp', 'rsync', 'jq', 'yq',
  'get-content', 'gc', 'copy-item', 'import-csv', 'format-hex', 'out-string',
])
const SEARCHERS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'select-string', 'sls', 'findstr'])
const GIT_SHOWS = new Set(['show', 'diff', 'blame', 'log', 'cat-file'])

// Words of one segment, quotes kept off. Mirrors package-gate's tokenizer.
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
    } else if (c === '<' && command[i + 1] !== '<') {
      endWord()
      words.push('<')
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

const fileWord = (w: string) => w.replace(/^[A-Za-z]+:(?=[^\\/])/, '') // git show HEAD:.env → .env

export function shellRead(command: string): string | undefined {
  for (const words of segments(command)) {
    const tool = words[0].toLowerCase().replace(/\.exe$/, '')
    const rest = words.slice(1)
    const positional = rest.filter(w => !w.startsWith('-'))

    // input redirect from a secret file: anything < .env
    const redirected = words.findIndex(w => w === '<')
    if (redirected >= 0 && words[redirected + 1] && isSecretFile(words[redirected + 1])) return words[redirected + 1]

    if (READERS.has(tool)) {
      const hit = positional.find(isSecretFile)
      if (hit) return hit
    }
    if (SEARCHERS.has(tool)) {
      // the first positional is the pattern (".env" in a grep of .gitignore is fine)
      const hasExplicitPattern = rest.some(w => w === '-e' || w === '-f' || /^-pattern$/i.test(w))
      const files = hasExplicitPattern ? positional : positional.slice(1)
      const pathFlag = rest.findIndex(w => /^-(path|literalpath)$/i.test(w))
      const hit = files.find(isSecretFile) ?? (pathFlag >= 0 && isSecretFile(rest[pathFlag + 1] ?? '') ? rest[pathFlag + 1] : undefined)
      if (hit) return hit
    }
    if (tool === 'git' && GIT_SHOWS.has((positional[0] ?? '').toLowerCase())) {
      const hit = positional.slice(1).map(fileWord).find(isSecretFile)
      if (hit) return hit
    }
    if (/^(node|python3?|py|deno|bun|ruby|perl)$/.test(tool)) {
      const hit = rest.flatMap(w => w.match(/[\w./\\-]*(\.env[\w.]*|\.dev\.vars[\w.]*|tokens?\.json|credentials\.json)/g) ?? []).find(isSecretFile)
      if (hit && /readFile|open\(|read_text|load_dotenv|dotenv/.test(command)) return hit
    }
  }
  return undefined
}

export function envDump(command: string): boolean {
  return segments(command).some(words => {
    const tool = words[0].toLowerCase()
    if ((tool === 'printenv' || tool === 'env' || tool === 'set') && words.length === 1) return true
    if (/^(get-childitem|gci|dir|ls|get-item)$/.test(tool)) {
      return words.slice(1).some(w => /^env:[\\/]?$/i.test(w))
    }
    return false
  })
}

// ── redaction ─────────────────────────────────────────────────────────────────
export const MARK = '[redacted by secret-shield]'
// Code, not a value: `process.env.API_KEY`, `getToken()`, `os.environ[...]`. Dotted
// parts with digits (`MTk4.Cl2F.ZnCj`) still look like a token and stay redacted.
const CODE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*[([]|^[A-Za-z_$]+(?:\.[A-Za-z_$]+)+[!?]?$/
const PLACEHOLDER = /^(.{0,3}|.*(example|placeholder|your[_-]|xxx|changeme|redacted|dummy|fake|test|\*\*\*|<|\$\{|\$\().*)$/i
const SECRET_KEY = '[A-Za-z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|AUTH_?KEY|CLIENT_?SECRET|ACCESS_?KEY)[A-Za-z0-9_]*'

// keep: how many leading groups to keep. code: also pass values that are code.
type Rule = { re: RegExp; keep?: number; code?: boolean }

const RULES: Rule[] = [
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  // KEY=value and KEY: value lines (env files, YAML, wrangler output, source code)
  { re: new RegExp(`(\\b(?!PUBLIC_)${SECRET_KEY}\\s*[=:]\\s*["']?)([^\\s"',;]{8,})`, 'gi'), keep: 1, code: true },
  // "accessToken": "..." in JSON
  { re: new RegExp(`("(?!public)${SECRET_KEY}"\\s*:\\s*")([^"]{8,})`, 'gi'), keep: 1 },
  // <writeToken>...</writeToken> in XML
  { re: /(<\w*(?:token|secret|password|apikey)\w*>)([^<]{12,})(?=<\/)/gi, keep: 1 },
  { re: /(Authorization:\s*(?:Bearer|token)\s+)([A-Za-z0-9._~+/=-]{20,})/gi, keep: 1 },
  { re: /(?<![A-Za-z0-9+/])sk[A-Za-z0-9]{70,}(?![A-Za-z0-9+/=])/g }, // Sanity
  { re: /(?<![A-Za-z0-9])sk-(?:ant-|proj-)?[A-Za-z0-9_-]{30,}/g }, // Anthropic, OpenAI
  { re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g },
  { re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { re: /\bAKIA[0-9A-Z]{16}\b/g },
  { re: /\beyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g }, // JWT
  { re: /\boauth:[a-z0-9]{20,}/g }, // Twitch chat token
]

export function redact(text: string): { text: string; count: number } {
  let count = 0
  let out = text
  for (const { re, keep, code } of RULES) {
    out = out.replace(re, (...m: string[]) => {
      const whole = m[0]
      if (keep === undefined) {
        count++
        return MARK
      }
      const value = m[keep + 1] ?? ''
      if (PLACEHOLDER.test(value) || (code && CODE.test(value))) return whole
      count++
      return m.slice(1, keep + 1).join('') + MARK
    })
  }
  return { text: out, count }
}

// Claude saw MARK where a value was. Writing what it saw back would replace
// the real value with MARK, so an edit may not add more MARKs than it removes.
const marks = (text: string) => text.split(MARK).length - 1
export const addsMark = (before: string, after: string) => marks(after) > marks(before)
