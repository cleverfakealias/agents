# Claude Code — Best Practices (2026)

Distilled from `code.claude.com/docs/en/*`. Read once; the scaffold encodes the rest.

## Memory hierarchy

Load order (broadest → most specific, all concatenated):

1. Managed policy (`/etc/claude-code/CLAUDE.md` or OS equivalent)
2. User: `~/.claude/CLAUDE.md`
3. Project shared: `./CLAUDE.md` **or** `./.claude/CLAUDE.md`
4. Project local: `./CLAUDE.local.md` (gitignored)
5. Nested: `<subdir>/CLAUDE.md` (loaded on demand when Claude reads files there)
6. Rules: `.claude/rules/*.md` with optional `paths:` frontmatter

Imports: `@path/to/file` (relative or absolute, max 5-hop recursion).

## When to put a rule where

| Lives in | Rule | Why |
|---|---|---|
| `CLAUDE.md` (root) | Behavior, conventions, gotchas, commands Claude can't infer | Injected every session, ≤200 lines |
| `<subdir>/CLAUDE.md` | Subsystem-local invariants | Loaded only when Claude enters that dir |
| `.claude/rules/<topic>.md` with `paths:` glob | Per-language or per-area style | Path-scoped, doesn't bloat root |
| `.claude/settings.json` `permissions` | Hard allow/deny of tools | Enforced, can't be argued away |
| `.claude/settings.json` `hooks` | Must-happen-every-time | Deterministic; the only un-skippable layer |
| `.claude/skills/<name>/SKILL.md` | Multi-step procedure with bundled scripts | Auto-discoverable; body loads on invocation |
| `.claude/agents/<name>.md` | Delegated task with capped tools/model | Protects main context; runs cheaper models |

**Rule of thumb:** if a rule MUST happen every time, make it a **hook**. If it's behavior guidance, put it in **CLAUDE.md**. If it's a workflow, package it as a **skill**.

## Skills (the modern command system)

Path: `.claude/skills/<skill-name>/SKILL.md`.

```yaml
---
name: review-pr
description: Review the diff of the current branch for security, performance, and correctness. Use when the user asks to review a PR or before merging.
argument-hint: [pr-number]
allowed-tools: Bash(gh *) Read Grep
disable-model-invocation: false   # let Claude trigger automatically
model: inherit
paths: ["**/*"]
---
Body of the skill (markdown). Reference bundled scripts via ${CLAUDE_SKILL_DIR}.
```

- **Loading:** at session start, Claude sees every skill's `name` + `description` (combined cap 1,536 chars; total budget 1% of context window). Full body loads only on invocation.
- **After /compact:** the most recent invocation of each skill re-attaches up to 5k tokens each, 25k total.
- **Supporting files:** `scripts/`, `references/`, `assets/` siblings to `SKILL.md` — read on demand.
- **Inline bash:** `` !`cmd` `` pre-executes before Claude sees the skill body.
- **Cap each `SKILL.md` at ≤500 lines.**

### Description triggers — be explicit

`description` is the only thing Claude sees to decide whether to invoke a skill. Vague descriptions ("PR review tool") trigger inconsistently. Format:

```
{One-line of what the skill does.} {When to use it — list concrete user phrases / situations, "/" or comma-separated.}
```

Concrete triggers beat abstract ones. `Use when user says "diagnose this" / "debug this", reports a bug, says something is broken/throwing/failing` will fire reliably; `Use for debugging` won't.

### Progressive disclosure — bundle resources

`SKILL.md` is the *index*. Detail goes in sibling files that the SKILL body links to (`[tests.md](tests.md)`, `[scripts/foo.sh](scripts/foo.sh)`). These don't count against the per-session description budget; Claude reads them on demand when the skill body cites them.

Use this pattern when the skill needs: format specs (`ADR-FORMAT.md`), reference vocabulary (`LANGUAGE.md`), runnable templates (`scripts/*.template.sh`), or worked examples (`tests.md`).

## Documentation as Code (CONTEXT.md + ADRs)

Two project artifacts the scaffold's skills assume — see `shared/principles.md` §11 for the canonical rule. Both live in the *consuming* repo and are created lazily.

- **`CONTEXT.md`** (root): domain glossary. One sentence per term. `_Avoid_:` line surfaces aliases. Format spec in `.claude/skills/grill-with-docs/CONTEXT-FORMAT.md`.
- **`docs/adr/`**: sequential `0001-slug.md`. One paragraph is enough. Three-test for offering one (hard to reverse, surprising, real trade-off). Format spec in `.claude/skills/grill-with-docs/ADR-FORMAT.md`.

Skills under `.claude/skills/` that **read** these files: `to-prd`, `to-issues`, `triage`, `diagnose`, `tdd`, `improve-codebase-architecture`, `zoom-out`. Skills that **write** them: `grill-with-docs`, `improve-codebase-architecture`. Mention these artifacts in `CLAUDE.md` so they're not invisible.

## Settings cheat sheet

`.claude/settings.json` (committed):

```json
{
  "model": "claude-sonnet-4-6",
  "permissions": {
    "defaultMode": "ask",
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Bash(rm -rf *)",
      "Bash(git push --force*)"
    ],
    "allow": [
      "Bash(pnpm *)",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(gh *)"
    ]
  },
  "hooks": { /* see hooks section */ },
  "includeCoAuthoredBy": true,
  "cleanupPeriodDays": 30
}
```

Precedence: Managed > CLI args > Local > Project > User. Deny always wins over allow.

## Hooks

Configured under `hooks` in any `settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-secret-writes.sh",
        "timeout": 5
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/lint-after-edit.sh",
        "timeout": 30
      }]
    }]
  }
}
```

**Exit codes:** `0` success (stdout parsed as JSON if present); `2` blocks the action and surfaces stderr to Claude; anything else is a non-blocking error.

**Useful events (2026):** `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `SubagentStart`, `SubagentStop`, `Stop`, `PreCompact`, `PostCompact`, `WorktreeCreate`, `FileChanged`, `InstructionsLoaded`.

## Subagents

Path: `.claude/agents/<name>.md`:

```yaml
---
name: security-reviewer
description: Reviews recently changed code for security issues. Use proactively after edits to auth, input validation, or query construction.
tools: Read, Grep, Glob, Bash(rg *)
model: sonnet
---
You are a senior security engineer. Examine the diff for: injection, authz flaws,
secrets in code, missing input validation, unsafe deserialization, SSRF. Report
findings as `severity: file:line — issue — fix`. Cap report at 20 items.
```

**Use a subagent when:** the task would flood main context with file reads/logs/search results you won't reuse, OR you want to cap tools, OR you want to run a cheaper model.

## MCP

`.mcp.json` at repo root (committed):

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp",
      "headers": { "Authorization": "Bearer ${SENTRY_TOKEN}" }
    }
  }
}
```

Tool naming: `mcp__<server>__<tool>` — use that exact form in `permissions.allow`/`deny`.

## Output styles

`.claude/output-styles/<name>.md` — modifies the system prompt. Activate via `outputStyle` in settings or on launch. Built-ins: `Default`, `Proactive`, `Explanatory`, `Learning`.

## Status line

`.claude/settings.json`:
```json
{ "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" } }
```
Script receives JSON session data on stdin; prints what to display.

## Plugins

Bundle skills + agents + hooks + MCP into a single installable. Manifest at `<plugin>/.claude-plugin/plugin.json`. Sibling dirs (NOT inside `.claude-plugin/`): `skills/`, `agents/`, `hooks/hooks.json`, `commands/`, `.mcp.json`. Plugin skills are namespaced `/plugin-name:skill-name`.

## Sources

- [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory)
- [code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings)
- [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)
- [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents)
- [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp)
- [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices)
- [code.claude.com/docs/en/plugins](https://code.claude.com/docs/en/plugins)
