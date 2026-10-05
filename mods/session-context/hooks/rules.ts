// Pure logic for session-context: turn git and folder facts into the short
// lines Claude reads with a prompt.

export type GitStatus = {
  branch: string
  hasUpstream: boolean
  ahead: number
  behind: number
  changed: number
  untracked: number
}

// `git status --porcelain=v2 --branch`
export function parseStatus(out: string): GitStatus {
  const s: GitStatus = { branch: '?', hasUpstream: false, ahead: 0, behind: 0, changed: 0, untracked: 0 }
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('# branch.head ')) s.branch = line.slice(14).trim()
    else if (line.startsWith('# branch.upstream ')) s.hasUpstream = true
    else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+) -(\d+)/)
      if (m) [s.ahead, s.behind] = [Number(m[1]), Number(m[2])]
    } else if (/^[12u] /.test(line)) s.changed++
    else if (line.startsWith('? ')) s.untracked++
  }
  return s
}

export type Pm = { name: string; where: string } // where: '' for the repo root, else a subfolder

export function repoLine(repo: string, pm: Pm | undefined, s: GitStatus): string {
  const parts = [`Repo ${repo}${pm ? ` (${pm.name}${pm.where ? ` in ${pm.where}/` : ''})` : ''}`, `branch ${s.branch === '(detached)' ? 'detached HEAD' : s.branch}`]
  const dirty = [s.changed && `${s.changed} changed`, s.untracked && `${s.untracked} untracked`].filter(Boolean)
  parts.push(dirty.length ? dirty.join(', ') : 'clean')
  if (!s.hasUpstream) parts.push('no upstream')
  else if (s.ahead || s.behind) parts.push([s.ahead && `${s.ahead} ahead`, s.behind && `${s.behind} behind`].filter(Boolean).join(', ') + ' of upstream')
  return parts.join(' · ')
}

export function notRepoLine(dir: string, repos: readonly string[]): string {
  const list = repos.length ? ` It holds ${repos.length} repos (${repos.slice(0, 12).join(', ')}${repos.length > 12 ? ', ...' : ''}).` : ''
  return `Folder ${dir} is not a git repo.${list} Start each repo command with an absolute cd, for example: cd /z/github_projects/<repo> && ...`
}

export type SpecFile = { path: string; mtimeMs: number }

// The newest spec status: specs/<slug>/status.md, or a specs/<slug>.md file.
export const newestSpec = (files: readonly SpecFile[]) =>
  [...files].sort((a, b) => b.mtimeMs - a.mtimeMs)[0]

// The first lines of a note, front matter and blank lines dropped.
export function excerpt(text: string, maxLines = 12): string {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  const lines = body.split(/\r?\n/).filter(l => l.trim())
  return lines.slice(0, maxLines).join('\n') + (lines.length > maxLines ? '\n...' : '')
}
