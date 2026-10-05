// Pure rules for shell-sense: no `$`, so `claude plugin test` can run them directly.
// Each rule answers a deny reason (the call never runs) or a note the model reads
// after the result. Deny only what is certain to fail; note what is only likely.

export type Verdict = { deny: string } | { note: string } | undefined

const HEREDOC_MAX_LINES = 40

// Drop quoted spans so operators inside strings ("a && b", 'x ?? y') don't match.
export const stripQuoted = (command: string): string =>
  command.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/gs, '""')

const INLINE_SCRIPT =
  /(^|[\s;&|(])(python3?|py|node)(\.exe)?\s+(-c\s|-e\s|--eval\s|-\s*<<|-\s*$|<<)/m
const WRITES_FILES =
  /writeFileSync|writeFile\(|appendFileSync|\.write_text\(|\.write_bytes\(|open\([^)]*,\s*['"][wa]|\bshutil\.(copy|move)/

export function bash(command: string): Verdict {
  const lines = command.split('\n').length
  const hasHeredoc = /<<-?\s*['"]?\w+['"]?/.test(command)

  if (INLINE_SCRIPT.test(command) && WRITES_FILES.test(command)) {
    return {
      deny:
        'shell-sense: this inline script edits files. Use the Edit or Write tool instead, so the diff shows, ' +
        'the formatter hook runs, and Claude keeps an accurate view of the file. For a large mechanical change, ' +
        'Write the script to the scratchpad first and run it from there.',
    }
  }
  if (hasHeredoc && lines > HEREDOC_MAX_LINES) {
    return {
      deny:
        `shell-sense: this heredoc is ${lines} lines. Long heredocs fail in this shell with "unexpected EOF". ` +
        'Write the content to a file with the Write tool (the scratchpad is fine), then run or cat that file.',
    }
  }
  if (/(^|[\s;&|])pwsh(\.exe)?(\s|$)/.test(stripQuoted(command))) {
    return {
      deny:
        'shell-sense: pwsh (PowerShell 7) is not installed here. Use the PowerShell tool, which runs Windows PowerShell 5.1.',
    }
  }
  if (/(^|[\s;&|])tar\s[^|;&]*\s['"]?[A-Za-z]:[\\/]/.test(command) && !/--force-local/.test(command)) {
    return {
      deny:
        'shell-sense: GNU tar reads "C:" as a remote host. Add --force-local, or use a /c/... path.',
    }
  }
  if (/(^|\s)[A-Za-z]:\\[^\s'"]/.test(stripQuoted(command))) {
    return {
      note:
        'shell-sense: Bash removes unquoted backslashes, so a path like Z:\\dir\\file becomes Z:dirfile. ' +
        'In Bash, write /z/dir/file or Z:/dir/file, or quote the Windows path.',
    }
  }
  return undefined
}

export function powershell(command: string): Verdict {
  const bare = stripQuoted(command)

  if (/\s\?\?=?\s/.test(bare) || /\w\?\.\w/.test(bare)) {
    return {
      deny:
        'shell-sense: Windows PowerShell 5.1 has no ?? or ?. operators. Use if ($null -eq $x) { ... } else { ... } instead.',
    }
  }
  if (/\s(&&|\|\|)\s/.test(bare)) {
    return {
      deny:
        'shell-sense: Windows PowerShell 5.1 has no && or || chain operators. Use "A; if ($?) { B }" to run B only when A succeeds, or "A; B" to run both.',
    }
  }
  const hereString = command.match(/git\s+commit\b[^\n]*-m\s+@(['"])\r?\n([\s\S]*?)\r?\n\1@/)
  if (hereString && hereString[2].includes('"')) {
    return {
      deny:
        'shell-sense: PowerShell 5.1 splits a native argument at embedded double quotes, so git reads parts of this ' +
        'message as pathspecs. Write the message to a file with the Write tool and run git commit -F <file>.',
    }
  }
  if (/\b2>&1\b/.test(bare) && /\b(pnpm|npm|npx|git|node|wrangler|python)\b/.test(bare)) {
    return {
      note:
        'shell-sense: in PowerShell 5.1, 2>&1 on a native program wraps each stderr line in an error record and sets $? to false even on exit code 0. Drop 2>&1; stderr is captured already.',
    }
  }
  return undefined
}
