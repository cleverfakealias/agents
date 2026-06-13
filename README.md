# agents — one clean scaffold for agentic development

A single, condensed project scaffold for AI-assisted coding, built on
June-2026 best practices. Claude Code–native, with `AGENTS.md` as the
cross-tool contract so Cursor, Codex, Copilot, Devin, and friends read the
same rules.

The premise: don't make the agent remember standards — **automate them**.
Hooks format, lint, and test automatically; skills carry the language
conventions; permissions and guard hooks enforce security policy.

## What's in the box

```
scaffold/                      ← copy this into your repo
├── AGENTS.md                  cross-tool contract (fill in the placeholders)
├── CLAUDE.md                  @AGENTS.md import + Claude-specific notes
└── .claude/
    ├── settings.json          permissions (secret-read denials, no force-push,
    │                          no publish) + hook wiring
    ├── hooks/
    │   ├── format-and-lint.sh       PostToolUse: ruff / biome / stylua+selene on
    │   │                            every file Claude edits; unfixable issues are
    │   │                            fed back to Claude to fix
    │   ├── run-tests-on-stop.sh     Stop: typecheck + tests for files changed this
    │   │                            session (pytest / tsc+vitest / busted); failures
    │   │                            block Claude from finishing until fixed
    │   ├── block-secret-writes.sh   PreToolUse: no writes to .env/keys/creds or
    │   │                            policy files (.claude/settings, hooks, .mcp.json)
    │   ├── block-destructive-bash.sh PreToolUse: no rm -rf /, force push, curl|sh;
    │   │                            no shell reads of secrets (cat .env, ~/.ssh —
    │   │                            the Bash bypass of Read deny rules); no env
    │   │                            dumps; no policy-file edits; npx/uvx/pnpm-dlx
    │   │                            gated to allowed-run-packages.txt
    │   ├── webfetch-allowlist.sh    PreToolUse: WebFetch only to domains in
    │   │                            allowed-domains.txt (prompt-injection front door)
    │   └── allowed-domains.txt / allowed-run-packages.txt   human-edited allowlists
    ├── skills/
    │   ├── python-standards/        uv + ruff + pytest + typing + security
    │   ├── typescript-standards/    pnpm + biome + tsc + vitest + security
    │   ├── lua-standards/           stylua + selene + busted + LuaLS + security
    │   ├── security-review/         OWASP-agentic-aware review checklist
    │   └── commit-and-push/         user-invoked only; scans for secrets first
    ├── agents/
    │   └── security-reviewer.md     read-only audit subagent
    └── settings.local.json.example  OS sandbox + network allowlist (copy to
                                     settings.local.json — the real boundary)
providers.md                   ← gotchas for Cursor / Copilot / Codex / Gemini / Devin
```

## Setup

### 1. Copy the scaffold into your repo

```bash
cp -r /path/to/agents/scaffold/. /path/to/your-repo/
cd /path/to/your-repo
chmod +x .claude/hooks/*.sh
```

(`cp -r scaffold/.` — the trailing `/.` matters: it copies the *contents*,
including the dot-directories.) On Windows, run this from Git Bash — the hooks
are bash scripts, which Claude Code executes via Git Bash on Windows.

### 2. Fill in AGENTS.md

Open `AGENTS.md` and replace every `<!-- placeholder -->`: project name,
purpose, stack. In the **Commands** block, keep only the language sections you
use and make the commands real (they're what every agent will run). Add any
off-limits paths under **Boundaries**.

### 3. Gitignore the local settings file

```bash
echo ".claude/settings.local.json" >> .gitignore
```

`settings.json` (shared policy) is committed; `settings.local.json`
(per-machine) is not.

### 4. Enable the OS sandbox (recommended)

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

Then edit the `network.allowedDomains` list for whatever registries/APIs your
project actually needs. This is the layer that actually enforces the security
policy — hooks and deny rules are advisory layers above it.

### 5. Tune the allowlists (optional)

- `.claude/hooks/allowed-domains.txt` — domains Claude may WebFetch.
- `.claude/hooks/allowed-run-packages.txt` — packages runnable via
  `npx`/`uvx`/`pnpm dlx`.

Edit these by hand as needs come up; the agent is deliberately blocked from
editing them itself.

### 6. Verify it works

Open Claude Code in the repo and ask it to make a small change to a Python,
TS, or Lua file. You should see: the file comes back formatted; lint problems
get fixed without being asked; and when Claude finishes, the test suite runs
for whatever changed. Then ask it to `cat .env` — it should refuse with a
hook message. That's the whole system working.

### Day-to-day

- Hooks self-disable when a tool isn't installed (no ruff → Python hook
  no-ops), so the scaffold drops into Python-only, TS-only, mixed, or
  greenfield repos unchanged.
- `CLAUDE_SKIP_STOP_TESTS=1 claude` skips the test-on-stop hook for a session.
- `/security-review` before merging significant changes; `/commit-and-push`
  for guarded commits.
- Using another agent? `AGENTS.md` is read natively by almost everything —
  see [providers.md](providers.md) for per-tool setup and gotchas.

## Toolchain assumptions (June 2026)

Python: **uv** + **ruff 0.15** + **pytest 9** (mypy/pyright as typecheck gate; ty when stable).
TypeScript: **pnpm 11** + **Biome 2.4** + **tsc --noEmit** (tsgo as drop-in) + **vitest**.
Lua: **StyLua 2.x** + **selene** (luacheck legacy) + **busted** (LuaLS `--check` advisory).
Security: layered — deny rules (first line), guard hooks (reliable enforcement:
secret reads/writes, destructive commands, policy-file self-modification, WebFetch
domain allowlist, npx/uvx gating), OS sandbox with network allowlist (real
boundary). Plus: `disableBypassPermissionsMode`, lockfile-frozen installs,
dependency cooldowns left on, external content treated as untrusted (OWASP
Agentic Top 10).

Older multi-provider scaffolds (Claude/Copilot/Cursor/Gemini/Codex/Windsurf,
plus the legacy `.agents/` system) live in git history before June 2026.
