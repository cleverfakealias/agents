import { describe, expect, test } from 'claude-code/testing'

import { bash, powershell, stripQuoted } from '../hooks/rules'

const kind = (v: ReturnType<typeof bash>) => (v === undefined ? 'pass' : 'deny' in v ? 'deny' : 'note')

describe('bash', () => {
  test('denies inline python that writes files', () => {
    expect(kind(bash(`python - <<'EOF'\nopen('a.txt','w').write('x')\nEOF`))).toBe('deny')
    expect(kind(bash(`node -e "require('fs').writeFileSync('a','b')"`))).toBe('deny')
  })
  test('allows inline scripts that only read', () => {
    expect(kind(bash(`node -e "console.log(require('./package.json').version)"`))).toBe('pass')
    expect(kind(bash(`python -c "import sys; print(sys.version)"`))).toBe('pass')
  })
  test('denies long heredocs and allows short ones', () => {
    const body = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n')
    expect(kind(bash(`cat > out.txt <<'EOF'\n${body}\nEOF`))).toBe('deny')
    expect(kind(bash(`git commit -F - <<'EOF'\nfix: a thing\n\nwhy it matters\nEOF`))).toBe('pass')
  })
  test('denies pwsh and tar with a drive letter', () => {
    expect(kind(bash('pwsh -Command Get-Date'))).toBe('deny')
    expect(kind(bash('tar -xf C:/tmp/a.tar'))).toBe('deny')
    expect(kind(bash('tar --force-local -xf C:/tmp/a.tar'))).toBe('pass')
  })
  test('notes unquoted backslash paths but not quoted ones', () => {
    expect(kind(bash('ls Z:\\github_projects\\agents'))).toBe('note')
    expect(kind(bash('ls "Z:\\github_projects\\agents"'))).toBe('pass')
    expect(kind(bash('cd /z/github_projects/agents && git status'))).toBe('pass')
  })
})

describe('powershell', () => {
  test('denies 5.1-incompatible operators outside strings', () => {
    expect(kind(powershell('$a = $b ?? 1'))).toBe('deny')
    expect(kind(powershell('$x?.Name'))).toBe('deny')
    expect(kind(powershell('npm test && npm run build'))).toBe('deny')
  })
  test('allows the same text inside strings', () => {
    expect(kind(powershell(`git commit -m "fix a && b"`))).toBe('pass')
    expect(kind(powershell(`Write-Output 'what ?? now'`))).toBe('pass')
    expect(kind(powershell('npm test; if ($?) { npm run build }'))).toBe('pass')
  })
  test('denies a here-string commit message with double quotes', () => {
    expect(kind(powershell(`git commit -m @'\nfix: handle "quoted" names\n'@`))).toBe('deny')
    expect(kind(powershell(`git commit -m @'\nfix: plain message\n'@`))).toBe('pass')
  })
  test('notes 2>&1 on a native program', () => {
    expect(kind(powershell('pnpm build 2>&1'))).toBe('note')
  })
})

describe('cost', () => {
  test('quotes are stripped as before, unclosed ones included', () => {
    expect(stripQuoted(`echo "a && b" 'c ?? d' x`)).toBe(`echo "" "" x`)
    expect(stripQuoted(`it's "a && b"`)).toBe(`it's ""`)
    expect(stripQuoted(`say "esc \\" quote" && go`)).toBe(`say "" && go`)
  })
  test('the here-string rule still reads the message body', () => {
    expect(kind(powershell(`git commit -m @'\n'@`))).toBe('pass')
    expect(kind(powershell(`git commit -m @"\nsay "hi"\n"@`))).toBe('deny')
  })
  test('stays linear on commands built to backtrack', () => {
    const n = 16000 // each took 0.2 to 0.6 s before; the cost grew with the square of n
    for (const run of [
      () => powershell('x' + '"\\'.repeat(n)),
      () => powershell("git commit -m @'\n".repeat(n)),
      () => bash(' tar a'.repeat(n)),
      () => bash('node -e x ' + 'open(a,'.repeat(n)),
    ]) {
      const start = performance.now()
      run()
      expect(performance.now() - start).toBeLessThan(50)
    }
  })
})

test('a denied Bash call never reaches the tool', async ($, on) => {
  let ran = false
  on('tool.call', { tool: 'Bash' }, () => {
    ran = true
    return { result: { stdout: '', stderr: '', interrupted: false } }
  })
  const r = await $.tool.call({ tool: 'Bash', command: 'pwsh -Command Get-Date' })
  expect(ran).toBe(false)
  expect(JSON.stringify(r)).toContain('shell-sense')
})
