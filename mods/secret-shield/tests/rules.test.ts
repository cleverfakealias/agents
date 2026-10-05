import { describe, expect, test } from 'claude-code/testing'

import { envDump, isSecretFile, redact, shellRead } from '../hooks/rules'

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
})
