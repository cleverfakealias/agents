// Pure rules for secret-shield. Permission deny rules cover Claude's Read tool,
// not the shell, so a `head tokens.json` once printed live tokens into a
// transcript. These rules close that gap and scrub token shapes from tool output.

import { segments } from './shell'

// ── secret files ──────────────────────────────────────────────────────────────
const SECRET_FILE =
  /^(\.env(\..+)?|\.envrc|\.dev\.vars(\..+)?|tokens?\.json|\.?credentials(\.json)?|\.git-credentials|secrets?\.(json|ya?ml|toml)|service[-_]account.*\.json|.+\.(pem|key|p12|pfx)|id_(rsa|ed25519|ecdsa|dsa)|\.netrc|\.pypirc)$/i
const TEMPLATE = /\.(example|sample|template|dist|defaults)$/i

const base = (p: string) => p.replace(/^.*[\\/]/, '').replace(/^['"]|['"]$/g, '')

// A glob counts when it can match a secret file and no everyday file: `.en*`,
// `*.pem` and `id_*` do, `*`, `.*` and `*.json` don't.
const SECRET_NAMES = ['.env', '.env.local', '.envrc', '.dev.vars', 'tokens.json', 'credentials.json', '.git-credentials',
  'secrets.yaml', 'service-account.json', 'server.key', 'cert.pem', 'id_rsa', 'id_ed25519', '.netrc', '.pypirc']
const EVERYDAY_NAMES = ['package.json', 'tsconfig.json', 'README.md', 'index.ts', 'main.py', 'config.yaml', '.gitignore', '.editorconfig']
function globHitsSecret(glob: string): boolean {
  try {
    const re = new RegExp(`^${glob.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*+/g, '.*').replace(/\?/g, '.')}$`, 'i')
    return SECRET_NAMES.some(n => re.test(n)) && !EVERYDAY_NAMES.some(n => re.test(n))
  } catch {
    return false // an unclosed [ is not a glob we can read
  }
}

export const isSecretFile = (path: string) => {
  const name = base(path)
  if (TEMPLATE.test(name)) return false
  return /[*?[]/.test(name) ? globHitsSecret(name) : SECRET_FILE.test(name)
}

// ── shell reads ───────────────────────────────────────────────────────────────
const READERS = new Set([
  'cat', 'head', 'tail', 'less', 'more', 'bat', 'type', 'nl', 'od', 'xxd', 'hexdump', 'strings', 'base64',
  'sed', 'awk', 'sort', 'uniq', 'cut', 'tac', 'source', '.', 'cp', 'scp', 'rsync', 'jq', 'yq',
  'diff', 'cmp', 'comm', 'paste', 'rev', 'fold', 'zcat',
  'get-content', 'gc', 'copy-item', 'import-csv', 'format-hex', 'out-string',
])
const SEARCHERS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'select-string', 'sls', 'findstr'])
const GIT_SHOWS = new Set(['show', 'diff', 'blame', 'log', 'cat-file'])

const fileWord = (w: string) => w.replace(/^[A-Za-z]+:(?=[^\\/])/, '') // git show HEAD:.env → .env

// PowerShell's .NET calls: [IO.File]::ReadAllText('.env')
const NET_READ = /::(?:ReadAll(?:Text|Lines|Bytes)|OpenText|OpenRead)\(\s*['"]([^'"]+)['"]/gi

export function shellRead(command: string): string | undefined {
  for (const m of command.matchAll(NET_READ)) if (isSecretFile(m[1])) return m[1]
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
// Placeholder words count only as whole words: `test-token` is one, `Contest2024` is not.
const PLACEHOLDER =
  /^(.{0,3}|.*(your[_-]|xxx|\*\*\*|<|\$\{|\$\().*|(.*[^a-z])?(example|placeholder|changeme|redacted|dummy|fake|test)([^a-z].*)?)$/i
// Every quantifier around a keyword is bounded: an unbounded `\w*KEYWORD\w*`
// backtracks quadratically on one long word ("tokentoken..."), and a hook that
// outruns its budget is skipped, which would store the result unredacted.
const KEYWORDS = 'SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|AUTH_?KEY|CLIENT_?SECRET|ACCESS_?KEY'
const SECRET_KEY = `[A-Za-z0-9_]{0,64}(?:${KEYWORDS})[A-Za-z0-9_]{0,64}`
// Env-style names only (upper case) for the rules whose values may hold spaces, so
// code like `passwordLabel: "Enter your password"` stays readable.
const ENV_KEY = `(?!PUBLIC_)[A-Z0-9_]{0,64}(?:${KEYWORDS})[A-Z0-9_]{0,64}`

// keep: how many leading groups to keep. code: also pass values that are code.
type Rule = { re: RegExp; keep?: number; code?: boolean }

const RULES: Rule[] = [
  // The body stops at the next ----- line, so a BEGIN with no END scans one block, not the rest.
  { re: /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----[^-]*(?:-(?!----)[^-]*)*-----END [A-Z ]{0,40}PRIVATE KEY-----/g },
  // KEY="a value with spaces" and KEY='...'
  ...['"', "'"].map(q => ({
    re: new RegExp(`(\\b${ENV_KEY}\\s*[=:]\\s*${q})([^${q}\\r\\n]{8,})(?=${q})`, 'g'), keep: 1, code: true,
  })),
  // KEY=rest of the line, unquoted, as dotenv reads it (spaces, ; and # included)
  { re: new RegExp(`(^[ \\t]*(?:export[ \\t]+)?${ENV_KEY}[ \\t]*=[ \\t]*)([^\\s"'][^\\r\\n]{7,})`, 'gm'), keep: 1, code: true },
  // KEY=value and KEY: value anywhere (YAML, wrangler output, source code), up to a space
  { re: new RegExp(`(\\b(?!PUBLIC_)${SECRET_KEY}\\s*[=:]\\s*["']?)([^\\s"',;]{8,})`, 'gi'), keep: 1, code: true },
  // "accessToken": "..." in JSON
  { re: new RegExp(`("(?!public)${SECRET_KEY}"\\s*:\\s*")([^"]{8,})`, 'gi'), keep: 1 },
  // <writeToken>...</writeToken> in XML
  { re: /(<\w{0,64}(?:token|secret|password|apikey)\w{0,64}>)([^<]{12,})(?=<\/)/gi, keep: 1 },
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
