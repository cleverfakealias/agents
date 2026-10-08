# mods

User-level Claude Code mods: plugins of function hooks that load into every
session on this machine, whatever repo it runs in. The scaffold (`../scaffold`)
sets each repo's rules; these mods fix the friction that repeats across all of
them. Each one came out of an audit of 65 real sessions (2026-07 to 2026-10).

| Mod | What it does | Why |
| :- | :- | :- |
| `shell-sense` | Denies shell mistakes that are certain to fail on Windows: long heredocs, inline scripts that edit files, `pwsh`, `tar C:`, PowerShell 5.1's missing `??` `?.` `&&`, here-string commit messages with quotes. Notes likely ones (backslash paths in Bash, `2>&1` in PowerShell). | 40+ shell failures and 30+ fragile script edits |
| `package-gate` | Asks you before any package install (npm, pnpm, yarn, bun, npx, dlx, pip, uv, pipx, cargo, go, gem, winget, choco, scoop, PowerShell Gallery), with a registry link per package. Also asks when an Edit or Write adds a dependency to `package.json` or `requirements*.txt`. Lockfile restores (`npm ci`, `pnpm install`, `pip install -r`) pass. Redirects and shell variables (`*> $null`, `2>$null`) are never read as package names. | Nothing gets installed without you looking at it first |
| `secret-shield` | Denies shell reads of secret files (Read deny rules don't cover Bash), denies full env dumps, hides token values in tool output before the transcript keeps them, and checks `git add -A` and `git push` for secret files. Source code that only names a secret (`secret: string`, `Promise<string>`, `MAX_RESPONSE_TOKENS`) stays readable; a quoted value, or one with digits, is still hidden. | A live Twitch token and Sanity/Turnstile secrets ended up in transcripts |
| `repo-lock` | Denies dependency changes with the wrong package manager, or from a folder with no lockfile (the parent `Z:\github_projects`). Status line: `repo · package manager · branch` (terminal only: the Desktop Code tab draws no plugin status lines). | Wrong cwd and npm-vs-pnpm mix-ups in 15+ sessions |
| `context-meter` | A band above the prompt that warns on quality, not capacity, in tokens: amber from 200k ("quality fading"), red from 350k ("dumb zone"), and a handoff at 500k. Each mark is the smaller of that count and a share of the window (35%, 50%, 75%), so a 200k window warns at 70k, 100k and 150k. The marks sit a little above the 2025-2026 long-context results (recall bends near 128k-256k). The handoff: Claude writes a state doc to `.claude/handoff/` (the folder ignores itself), the session runs `/compact` with the doc named, then Claude reads the doc back and checks it against the repo. The engine's own autocompact waits for a handoff while there is room. Desktop draws a card: a ring gauge with ticks at the three marks, the tokens large, growth and turns to the next mark, the zone, and bars for the 5h and 7d limits. The terminal draws one row. Under it, a model radio group (from the `/config` model row, always the 1M variant where a family has one), an effort slider, and a Handoff button from the dumb zone; a refused command shows a toast. Details (or `d` while focused) opens the `/context` breakdown, growth per turn, limits with reset times, cost, cache hit rate and the largest memory files. | Long sessions that drifted into poor answers, cost, or compaction loops |
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
    "CLAUDE_CODE_PLUGIN_DIRS": "Z:/github_projects/agents/mods/shell-sense;Z:/github_projects/agents/mods/package-gate;Z:/github_projects/agents/mods/secret-shield;Z:/github_projects/agents/mods/repo-lock;Z:/github_projects/agents/mods/context-meter;Z:/github_projects/agents/mods/session-context",
    "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1"
  }
}
```

`CLAUDE_CODE_PLUGIN_DIR_WATCH=1` makes sessions that are already open, the
Desktop app's included, reload a mod when you save it. Without it, an edit
reaches new sessions only.

For one session only: `claude --plugin-dir mods/shell-sense --plugin-dir ...`.

## Work on them

Each mod is `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.ts`
(the hooks, which pass `$` only to functions declared in that file; `.tsx` where
it draws UI, as `context-meter` does), and
`hooks/rules.ts` (pure logic the tests import). `package-gate`, `repo-lock` and
`secret-shield` also hold `hooks/shell.ts`, the shell tokenizer they share: change
one copy, then copy it over the other two. `tests/mods.test.mjs` fails while they differ.

```bash
claude plugin validate mods/<name>    # what the engine would load or refuse
claude plugin test mods/<name>        # runs tests/*.test.ts against the engine
```

Type-check: run `/plugin-types mods/.types` in Claude Code once per Claude Code
update (it writes the API declarations, gitignored), then `tsc -p mods`.

Things that cost a debugging round:

- The Desktop Code tab draws no `$.ui.status` lines. Use an `AbovePrompt` band
  (`ui.render`) for anything that must stay on screen there.
- The engine heads each `$.ui.toast` with the plugin's name; don't add it again.
- `'Svg' in $.ui.resolve(e)` is true on the terminal too. Branch on `e.surface`.
- Never name a local `h` (the JSX factory) or `next` inside a hook (the engine
  refuses a shadowed continuation at load).
- Model and effort changes made through `$.command.run` (`/model`, `/effort`)
  apply to the session, but the Desktop app's own picker does not follow them.
