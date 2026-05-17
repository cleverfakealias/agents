# Cursor — Anti-Patterns

## `.cursor/rules/` anti-patterns

- **Walls of text.** Cap each rule file at **≤500 lines**; split by concern.
- **`alwaysApply: true` on everything.** Every always-rule is paid for on every turn. Use Auto Attached when the rule is language- or area-specific.
- **Stale globs.** `src/**/*.ts` that no longer matches your moved code is dead weight that still burns tokens. Grep your rules quarterly.
- **Restating language docs.** "Use TypeScript correctly" — Cursor knows. Rules encode *project-specific deltas*.
- **Putting team conventions in User Rules.** Invisible to teammates. Use project rules or `AGENTS.md`.
- **Conflicting rules.** Cursor picks arbitrarily on conflict. Pick one and delete the other.
- **`description:` on `alwaysApply: true` rules.** The description is only consulted for Agent Requested rules. Wasted bytes.
- **Missing `description:` on Agent Requested rules.** The agent has nothing to match against; the rule never fires.

## `.cursor/commands/` anti-patterns

- **Frontmatter.** Cursor commands are plain Markdown — frontmatter breaks them. (This is different from Claude Code skills.)
- **Long command bodies.** Commands should fit in ≤30 lines. Longer "workflows" belong in scripts or skills (other tools).
- **Commands that duplicate rules.** Rules are passive context; commands are imperative actions. Don't repeat house rules inside a command — they're already in context.

## `.cursorrules` (legacy) anti-patterns

- **Using it in 2026.** Deprecated since v0.45+. New repos should use `.cursor/rules/` and `AGENTS.md`. `/Generate Cursor Rules` warns if it produces one.
- **Mixing `.cursorrules` and `.cursor/rules/`.** Two sources of truth, no precedence guarantees. Migrate the legacy file and delete it.

## MCP anti-patterns (`.cursor/mcp.json`)

- **Secrets in `env:` directly.** Committed → leaked. Use `${env:VAR}` interpolation or `envFile`.
- **OAuth without HTTPS.** The callback `cursor://anysphere.cursor-mcp/oauth/callback` is fine; your server must be HTTPS.

## `environment.json` anti-patterns (cloud agents)

- **Secrets in `env:`.** Use the Secrets tab at `cursor.com/dashboard/cloud-agents` — environment-scoped, encrypted.
- **Non-idempotent `install:`.** The script runs on snapshot rebuild; if `npm install -g` accidentally upgrades global state every time, your snapshots drift.
- **No `persistedDirectories`.** `node_modules` rebuilt every session is slow and wasteful when the lockfile hasn't changed.
- **`start:` blocking forever.** Use it for one-shot setup (start docker, prefetch). Long-running processes belong in `terminals[]`.

## Tab anti-patterns

- **Writing rules expecting them to influence Tab.** Rules feed only Chat/Agent. Tab uses local file context. To shape Tab: write idiomatic neighbor code.

## General

- **Secrets / tokens / URLs in any rule file.** Names only.
- **Project-specific rules in User Rules.** Teammates don't get them. Use project rules.

## Sources

- [Rules](https://cursor.com/docs/rules)
- [Rules FAQ](https://cursor.com/docs/rules)
- [.cursorrules deprecation](https://www.flowql.com/en/blog/guides/cursor-rules-deprecated-libraries/)
