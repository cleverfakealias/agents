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
  `npx`/`uv