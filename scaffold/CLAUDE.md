@AGENTS.md

## Claude Code specifics

Automation in this repo (configured in `.claude/settings.json`):

- **Before each prompt**, a `UserPromptSubmit` gate (`spec-gate.mjs`) nudges
  implementation-looking prompts toward a spec when none exists — Zenn mode (see
  AGENTS.md). It never blocks; questions, opt-out phrases ("quick fix", "no
  spec"), and existing specs pass silently. Disable with `CLAUDE_SKIP_SPEC_GATE=1`.
- **On every Write/Edit** a hook auto-formats and lints the file (ruff / biome /
  stylua+selene). If it reports remaining issues, fix them before moving on —
  don't disable the hook.
- **When you finish a turn**, a Stop hook runs the typecheck and tests for any
  Python/TS/Lua files changed this session (pytest / tsc+vitest / busted). If it
  blocks you, fix the failures; it won't loop (it lets you stop on the second attempt).
- **At session start and end**, a cleanup hook removes git worktrees under
  `.claude/worktrees/` that are safe to delete (clean tree + commits already
  preserved elsewhere) and reports any holding unsaved work instead of deleting
  them. `.claude/worktrees/` is gitignored. Disable with
  `CLAUDE_SKIP_WORKTREE_CLEANUP=1`.
- **Guard hooks** block: writes to secret files; shell reads of secrets
  (`cat .env`, `~/.ssh`, etc.); env dumps (`printenv`); destructive commands;
  editing policy files (`.claude/settings*`, hooks, `.mcp.json`, `.git/`,
  CI workflows); WebFetch outside `.claude/hooks/allowed-domains.txt`; and
  npx/uvx/pnpm-dlx for packages not in `.claude/hooks/allowed-run-packages.txt`.
  If a guard blocks you, that's policy — tell the user instead of working
  around it. The allowlist files are edited by the user only.

Skills: `python-standards`, `typescript-standards`, `lua-standards`, and
`zenn-mode` load when relevant; `/zenn` and `/spec` start intent-driven work
explicitly; `/security-review` for audits; `/commit-and-push` is user-invoked
only. For large reviews, delegate to the `security-reviewer` subagent.

Sandbox: copy `.claude/settings.local.json.example` to
`.claude/settings.local.json` to enable OS-level sandboxing with a network
allowlist — it's the real security boundary; deny rules and hooks are the
layers above it.
