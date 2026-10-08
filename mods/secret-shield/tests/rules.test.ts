import { describe, expect, test } from 'claude-code/testing'

import { MARK, addsMark, envDump, isSecretFile, redact, shellRead } from '../hooks/rules'

// Values are built at run time so no secret-looking literal sits in the repo.
const filler = (seed: string, n: number) => seed.repeat(Math.ceil(n / seed.length)).slice(0, n)

describe('secret files', () => {
  test('names that hold secrets', () => {
    for (const f of ['.env', '.env.local', 'Z:/repo/.dev.vars', 'tokens.json', 'key.pem', 'id_ed25519', 'credentials.json'])
      expect(isSecretFile(f)).toBe(true)
  })
  test('templates and ordinary files pass', () => {
    for (const f of ['.env.example', '.dev.vars.example', '.env.template', 'id_ed25519.pub', 'package.json', 'env.d.ts'])
      expect(isSecretFile(f)).toBe(false)
  })
})

describe('shell reads', () => {
  test('readers of secret files are caught', () => {
    expect(shellRead('head -c 400 stream-overlay/tokens.json')).toBe('stream-overlay/tokens.json')
    expect(shellRead('cd /z/x && cat .dev.vars')).toBe('.dev.vars')
    expect(shellRead('Get-Content .env.local')).toBe('.env.local')
    expect(shellRead('git show HEAD:.env')).toBe('.env')
    expect(shellRead('wrangler secret bulk < .dev.vars')).toBe('.dev.vars')
    expect(shellRead(`node -e "console.log(require('fs').readFileSync('.env','utf8'))"`)).toBe('.env')
  })
  test('commands that only mention a secret file pass', () => {
    expect(shellRead('grep -n ".env" .gitignore')).toBeUndefined()
    expect(shellRead('ls -la .env')).toBeUndefined()
    expect(shellRead('echo ".dev.vars" >> .gitignore')).toBeUndefined()
    expect(shellRead('cat .env.example')).toBeUndefined()
    expect(shellRead('Test-Path .env')).toBeUndefined()
  })
  test('grep inside a secret file is caught', () => {
    expect(shellRead('grep SANITY .env')).toBe('.env')
  })
  test('wrapped, nested and globbed reads are caught', () => {
    for (const command of [
      'cat .en*',
      'cat .env?local',
      'head *.pem',
      'echo $(cat .env)',
      'echo "$(cat .env)"',
      "bash -c 'cat .env'",
      'powershell -c Get-Content .env',
      '$c = Get-Content .env',
      'time cat .env',
      'diff .env .env.example',
      "[IO.File]::ReadAllText('.env')",
      'cat ${HOME}/.env',
    ])
      expect(shellRead(command)).toBeTruthy()
  })
  test('heredoc bodies are data', () => {
    expect(shellRead("cat > notes.md <<'EOF'\ncat .env is blocked here\nEOF")).toBeUndefined()
    expect(shellRead("cat > notes.md <<'EOF'\nDon't share it.\nEOF\ncat .env")).toBe('.env')
  })
  test('globs that also match everyday files pass', () => {
    for (const command of ['cat *.json', 'grep -n token *', 'cat .*', 'ls .env*', 'cat .env.exam*'])
      expect(shellRead(command)).toBeUndefined()
  })
  test('full environment dumps', () => {
    expect(envDump('printenv')).toBe(true)
    expect(envDump('Get-ChildItem Env:')).toBe(true)
    expect(envDump('printenv PATH')).toBe(false)
    expect(envDump('$env:PATH')).toBe(false)
  })
})

describe('redaction', () => {
  test('env lines keep the name and hide the value', () => {
    const v = filler('Q9w8E7r6T5', 32)
    const r = redact(`TURNSTILE_SECRET_KEY=${v}\nPUBLIC_SITE_URL=https://example.com`)
    expect(r.count).toBe(1)
    expect(r.text).toContain('TURNSTILE_SECRET_KEY=[redacted by secret-shield]')
    expect(r.text).not.toContain(v)
  })
  test('JSON and XML token fields', () => {
    const v = filler('k3j4h5g6f7', 30)
    expect(redact(`{"accessToken": "${v}", "expiresIn": 14400}`).text).not.toContain(v)
    // The Desktop app's config.json: a namespaced key.
    const desktop = redact(`"oauth:tokenCache": "${v}",`)
    expect(desktop.count).toBe(1)
    expect(desktop.text).toContain('"oauth:tokenCache": "')
    expect(desktop.text).not.toContain(v)
    expect(redact(`<writeToken>${'sk' + filler('Ab12', 80)}</writeToken>`).count).toBeGreaterThan(0)
  })
  test('raw token shapes', () => {
    const sanity = 'sk' + filler('Zx9Yw8Vu7', 90)
    const gh = 'ghp_' + filler('aB3dE5', 36)
    const r = redact(`token ${sanity} and ${gh}`)
    expect(r.text).not.toContain(sanity)
    expect(r.text).not.toContain(gh)
  })
  test('placeholders, public keys and base64 data stay', () => {
    expect(redact('SANITY_API_TOKEN=your-token-here').count).toBe(0)
    expect(redact('API_KEY=EXAMPLE_API_KEY').count).toBe(0)
    expect(redact('PUBLIC_CF_BEACON_TOKEN=' + filler('ab12', 32)).count).toBe(0)
    expect(redact('data:image/png;base64,iVBOR/' + 'sk' + filler('Ab12', 90)).count).toBe(0)
  })
  test('env values with spaces, ; or a placeholder-like word inside are hidden whole', () => {
    const phrase = ['correct', 'horse', 'battery', 'staple'].join(' ')
    for (const line of [
      `PASSWORD=${phrase}`,
      `PASSWORD="${phrase}"`,
      `export DB_PASSWORD='${phrase}'`,
      `ADMIN_TOKEN = ${phrase}`,
    ]) {
      const r = redact(line)
      expect(r.text).not.toContain('horse')
      expect(r.count).toBe(1)
    }
    expect(redact(`DB_PASSWORD=Con${'test'}2024x`).text).not.toContain('2024')
    expect(redact(`SECRET_KEY=ab;${filler('cdefgh12', 20)}`).text).not.toContain('cdefgh')
  })
  test('placeholder words still count when they stand alone', () => {
    expect(redact('API_TOKEN=test-token-value').count).toBe(0)
    expect(redact('DB_PASSWORD="change me later"').count).toBe(1)
    expect(redact('DB_PASSWORD="changeme"').count).toBe(0)
  })
  test('UI strings and code with spaces stay readable', () => {
    for (const line of [
      'passwordLabel: "Enter your password"',
      'const token = await getToken()',
      'API_KEY = os.getenv("API_KEY")',
    ])
      expect(redact(line).text).toBe(line)
  })
  test('code that names a secret stays readable', () => {
    for (const line of [
      'const apiKey = process.env.API_KEY',
      'accessToken: response.data.token,',
      'token = getToken()',
      'secret = os.environ["APP_SECRET"]',
      'password: this.hashedPassword!',
    ])
      expect(redact(line).text).toBe(line)
  })
  test('TypeScript that names a secret stays readable', () => {
    for (const line of [
      'export async function hashIp(ip: string, day: string, secret: string): Promise<string> {',
      'async function isReplay(kv: KVNamespace, token: string): Promise<boolean> {',
      'function sign(secret: Uint8Array<ArrayBuffer>, apiKey: readonly string[]) {',
      '        max_tokens: MAX_RESPONSE_TOKENS,',
      'verify(token: turnstileToken)',
      'const SECRET_KEY = `[A-Za-z0-9_]{0,64}(?:${KEYWORDS})`',
      'const MENTIONS_SECRET = /\\.env\\b|tokens?\\.json/i',
    ])
      expect(redact(line).text).toBe(line)
  })
  test('values shaped like code are still hidden when quoted or carrying digits', () => {
    const shouty = ['MY', 'SUPER', 'SECRET', 'PASSPHRASE'].join('_')
    expect(redact(`password: "${shouty}"`).text).not.toContain(shouty)
    expect(redact(`password: '${shouty}'`).text).not.toContain(shouty)
    expect(redact(`APP_PASSWORD=${shouty}`).text).not.toContain(shouty)
    const typeLike = 'string' + filler('9Xk2', 24)
    expect(redact(`token: ${typeLike}`).text).not.toContain(typeLike)
    const constLike = 'MAX_' + filler('A7B', 21)
    expect(redact(`max_tokens: ${constLike}`).text).not.toContain(constLike)
  })
  test('values next to code-like ones are still hidden', () => {
    const dotted = `${filler('MTk4NjI', 24)}.${filler('Cl2FMQ', 6)}.${filler('ZnCjm1X', 27)}`
    expect(redact(`DISCORD_TOKEN=${dotted}`).text).not.toContain(dotted)
    const v = filler('Q9w8E7r6T5', 32)
    expect(redact(`const apiKey = "${v}"`).text).not.toContain(v)
  })
})

describe('redaction cost', () => {
  const dashes = '-'.repeat(5)
  const pem = (kind: string, body: string) =>
    `${dashes}BEGIN ${kind}PRIVATE KEY${dashes}\n${body}\n${dashes}END ${kind}PRIVATE KEY${dashes}`

  test('private key blocks are hidden, legacy headers included', () => {
    const body = filler('MIIEvQIBADANBgkqhkiG9w0BAQEFAASC', 256)
    expect(redact(pem('', body)).text).not.toContain(body)
    const legacy = `Proc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC,${filler('9F8E7D', 32)}\n\n${body}`
    expect(redact(pem('RSA ', legacy)).text).not.toContain(body)
  })
  test('a stray BEGIN does not stop the next key from being hidden', () => {
    const body = filler('MIIEvQIBADANBgkqhkiG9w0BAQEFAASC', 256)
    const r = redact(`${dashes}BEGIN PRIVATE KEY${dashes}\ncut off\n${pem('EC ', body)}`)
    expect(r.text).not.toContain(body)
  })
  test('stays linear on input built to backtrack', () => {
    const n = 64000 // about 313 KB each; the unbounded rules took 12 s on one of these
    const word = 'token'.repeat(n)
    const begin = `${dashes}BEGIN PRIVATE KEY${dashes}\n`
    for (const input of [word, `"${word}`, `<${word}`, begin.repeat(n / 6)]) {
      const start = performance.now()
      redact(input)
      expect(performance.now() - start).toBeLessThan(500)
    }
  })
})

describe('the redaction marker', () => {
  test('an edit may not add markers', () => {
    expect(addsMark('', `KEY=${MARK}`)).toBe(true)
    expect(addsMark(`a ${MARK}`, `b ${MARK}`)).toBe(false)
    expect(addsMark(`a ${MARK}`, 'a value')).toBe(false)
    expect(addsMark('plain', 'plain too')).toBe(false)
  })
})

test('an Edit that writes the marker never reaches the tool', async ($, on) => {
  let ran = false
  on('tool.call', { tool: 'Edit' }, () => {
    ran = true
    return { deny: 'reached the tool' }
  })
  const r = await $.tool.call({ tool: 'Edit', file_path: 'src/config.ts', old_string: 'apiKey: x', new_string: `apiKey: ${MARK}` })
  expect(ran).toBe(false)
  expect(JSON.stringify(r)).toContain('secret-shield')
})
