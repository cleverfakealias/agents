# mods

User-level Claude Code mods: plugins of function hooks that load into every
session on this machine, whatever repo it runs in. The scaffold (`../scaffold`)
sets each repo's rules; these mods fix the friction that repeats across all of
them. Each one came out of an audit of 65 real sessions (2026-07 to 2026-10).

| Mod | What it does | Why |
| :- | :- | :- |
| `shell-sense` | Denies shell mistakes that are certain to fail on Windows: long heredocs, inline scripts that edit files, `pwsh`, `tar C:`, PowerShell 5.1's missing `??` `?.` `&&`, here-string commit messages with quotes. Notes likely ones (backslash paths in Bash, `2>&1` in PowerShell). | 40+ shell failures and 30+ fragile script edits |
| `package-gate` | Asks you before any package install (npm, pnpm, yarn, bun, npx, dlx, pip, uv, pipx, cargo, go, gem, winget, choco, scoop, PowerShell Gallery), with a registry link per package. Also asks when an Edit or Write adds a dependency to `package.json` or `requirements*.txt`. Lockfile restores (`npm ci`, `pnpm install`, `pip install -r`) pass. | Nothing gets installed without you looking at it first |
| `secret-shield` | Denies shell reads of secret files (Read deny rules don't cover Bash), denies full env dumps, hides token values in tool output before the transcript keeps them, and checks `git add -A` and `git push` for secret files. | A live Twitch token and Sanity/Turnstile secrets ended up in transcripts |
| `repo-lock` | Denies dependency changes with the wrong package manager, or from a folder with no lockfile (the parent `Z:\github_projects`). Status line: `repo · package manager · branch`. | Wrong cwd and npm-vs-pnpm mix-ups in 15+ sessions |
| `context-meter` | Status line after each turn: `context 30% · 300k/1.0M · +100k last turn · ▃▅█ · 5h limit 42%`. A toast at 75% and 90% suggests `/compact`. Uses the status line, so it shows in the Desktop Code tab (the sample `token-weather` band is terminal only). | Long sessions that ran into compaction loops |
| `session-context` | With each typed prompt, Claude also reads one line: repo, package manager, branch, uncommitted work, upstream. It is sent only when it changed. The first prompt also gets the last 3 commits and the newest `specs/` status note. `/where` shows the same to you. In the parent folder it lists the repos and the absolute-cd rule. | "Where did we leave off?" (5+ times) and commands run in the wrong folder |

Rules are deliberately narrow: a deny names the fix, so the next try works.
The mods are steering, not a security boundary; the permission rules in each
repo's `.claude/settings.json` and the OS sandbox are that.

## Load them in every session

Add the mod folders to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of
`~/.claude/settings.json` (paths separated by `;` on Windows):

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "Z:/github_projects/agents/mods/shell-sense;Z:/github_projects/agents/mods/package-gate;Z:/github_projects/agents/mods/secret-shield;Z:/github_projects/agents/mods/repo-lock;Z:/github_projects/agents/mods/context-meter;Z:/github_projects/agents/mods/session-context"
  }
}
```

For one session only: `claude --plugin-dir mods/shell-sense --plugin-dir ...`.

## Work on them

Each mod is `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.ts`
(the hooks, which pass `$` only to functions declared in that file), and
`hooks/rules.ts` (pure logic the tests import).

```bash
claude plugin validate mods/<name>    # what the engine would load or refuse
claude plugin test mods/<name>        # runs tests/*.test.ts against the engine
```

Type-check: run `/plugin-types mods/.types` in Claude Code once per Claude Code
update (it writes the API declarations, gitignored), then `tsc -p mods`.
