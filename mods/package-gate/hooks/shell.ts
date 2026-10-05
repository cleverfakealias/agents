// The shell tokenizer package-gate, repo-lock and secret-shield share. Each mod is
// its own plugin folder, so each holds a copy of this file: change one, then copy
// it to the other two. tests/mods.test.mjs fails while the copies differ.
//
// Splits a shell command into segments (at && || ; | & ( ) $( ` and newlines
// outside quotes) of whitespace-separated words with their quotes removed, and
// `<` as a word of its own. A wrapper (time, env, sudo, corepack, ...) is
// dropped, and the script of a `bash -c` or `powershell -Command` is split in
// turn. Heredoc bodies are skipped unless a shell runs them. Good enough for the
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
    } else if (c === '<' && next !== '<') {
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
