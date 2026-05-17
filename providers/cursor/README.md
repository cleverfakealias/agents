# Cursor — Optimized Scaffold

> Drop-in scaffold for [Cursor](https://cursor.com) — Composer, Agent mode, Chat, Tab, and Background / Cloud Agents. Tuned for the 2026 `.cursor/rules/*.mdc` system (the legacy `.cursorrules` flat file is deprecated).

## What's in this folder

```
cursor/
├── README.md
├── docs/
│   ├── best-practices.md
│   └── anti-patterns.md
└── scaffold/                              ← drop into your target repo
    ├── AGENTS.md                          ← native since 2025 — cross-tool contract
    └── .cursor/
        ├── rules/
        │   ├── 00-house.mdc               ← alwaysApply: true (cross-cutting)
        │   ├── 10-typescript.mdc          ← auto-attach, globs: **/*.{ts,tsx}
        │   ├── 20-python.mdc              ← auto-attach, globs: **/*.py
        │   ├── 30-tests.mdc               ← auto-attach, globs: **/*.{test,spec}.*
        │   ├── 40-db-migrations.mdc       ← agent-requested
        │   └── 99-security-review.mdc     ← manual (@99-security-review)
        ├── commands/                       ← plain Markdown, NO frontmatter (this is the 1.6+ format)
        │   ├── init-cursor-standards.md   ← interactive setup
        │   ├── open-pr.md
        │   ├── write-tests.md
        │   └── fix-lint.md
        ├── mcp.json                        ← project-scoped MCP servers
        └── environment.json                ← Background / Cloud Agent env
```

## Install into a target repo

```bash
cp -r providers/cursor/scaffold/. /path/to/your-repo/
```

Then in Cursor's Agent input, type `/` and pick `init-cursor-standards`. The command walks you through detecting your stack, customizing rules, and pruning what you don't need.

## Why this layout

| Surface | Used for | Why |
|---|---|---|
| `AGENTS.md` | Cross-tool contract (Cursor native since 2025) | Plain Markdown, no frontmatter. Tool-portable. |
| `.cursor/rules/00-house.mdc` | `alwaysApply: true` cross-cutting rules | Lowest-noise hard rules — only what truly applies every turn. |
| `.cursor/rules/<lang>.mdc` (auto-attach) | Language-specific style | `globs` field attaches them when matching files are in context. Most rule files should be auto-attach, not always-on. |
| `.cursor/rules/40-db-migrations.mdc` (agent-requested) | Specialized domain | Agent decides relevance from the `description`. Saves budget vs always-on. |
| `.cursor/rules/99-security-review.mdc` (manual) | Heavyweight, opt-in | User invokes with `@99-security-review`. Don't burn tokens on it by default. |
| `.cursor/commands/*.md` | Slash commands (1.6+) | Plain Markdown — **no frontmatter** (unlike Claude skills). Filename becomes `/name`. |
| `.cursor/mcp.json` | Project-scoped MCP servers | `${env:VAR}`, `${workspaceFolder}` interpolation. Commit it. |
| `.cursor/environment.json` | Background / Cloud Agent env | `install`, `start`, `terminals[]`, `persistedDirectories`. |

## What's deprecated and excluded

- **`.cursorrules`** (flat root file) — deprecated since v0.45+; `/Generate Cursor Rules` now warns. New repos must not use it.
- **Frontmatter on `.cursor/commands/*.md`** — Cursor commands are plain Markdown. Frontmatter breaks them. (This differs from Claude skills.)

## A word on Tab

Cursor's Tab completion is a **separate model from Chat/Agent**. Rules in `.cursor/rules/` and `AGENTS.md` **do not feed Tab**. To influence Tab, surface conventions through code examples in nearby files — Tab learns from local context, not rules.

## See also

- [`docs/best-practices.md`](docs/best-practices.md) — the four rule types and when to use each
- [`docs/anti-patterns.md`](docs/anti-patterns.md)
- [`../../shared/principles.md`](../../shared/principles.md)
