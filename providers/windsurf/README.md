# Windsurf — Optimized Scaffold

> Drop-in scaffold for [Windsurf](https://windsurf.com) (Cascade agent — Code / Plan / Ask modes, Tab, Chat, Workflows, Memories). Tuned for the 2026 `.windsurf/rules/` system (legacy `.windsurfrules` is soft-deprecated) and first-class `AGENTS.md` support.

## What's in this folder

```
windsurf/
├── README.md
├── docs/
│   ├── best-practices.md
│   └── anti-patterns.md
└── scaffold/                                ← drop into your target repo
    ├── AGENTS.md                            ← root, treated as always_on by Windsurf
    └── .windsurf/
        ├── rules/
        │   ├── 00-house-rules.md            ← trigger: always_on (≤2k chars)
        │   ├── 10-typescript.md             ← trigger: glob, globs: **/*.{ts,tsx}
        │   ├── 20-python.md                 ← trigger: glob, globs: **/*.py
        │   ├── 30-tests.md                  ← trigger: glob, globs: test files
        │   ├── 40-db-migrations.md          ← trigger: model_decision
        │   └── 90-incident.md               ← trigger: manual (@incident)
        └── workflows/
            ├── init-windsurf-standards.md   ← /init-windsurf-standards
            ├── release.md                   ← /release
            └── address-pr-comments.md       ← /address-pr-comments
```

## Install into a target repo

```bash
cp -r providers/windsurf/scaffold/. /path/to/your-repo/
```

Then in Cascade chat (any mode), run:

```
/init-windsurf-standards
```

The workflow walks you through detecting your stack, customizing rules, and pruning what you don't need.

## Why this layout

| Surface | Trigger | Why |
|---|---|---|
| `AGENTS.md` (root) | Auto `always_on` | Universal contract — read by Windsurf natively + Codex / Cursor / Claude / Gemini. No frontmatter. |
| `<subdir>/AGENTS.md` | Auto `glob: <subdir>/**` | Loaded only when Cascade touches files there. Perfect for monorepo packages. |
| `.windsurf/rules/00-house-rules.md` | `always_on` | Cross-cutting hard rules. Keep ≤2k chars — every always-on byte is paid for per turn. |
| `.windsurf/rules/10-*` ... `30-*` (`glob`) | `glob` | Language- and area-specific style. Only injected when matching files are in context. |
| `.windsurf/rules/40-db-migrations.md` (`model_decision`) | Cascade decides | Only `description` is shown by default; full body pulled when relevant. Saves budget vs always-on. |
| `.windsurf/rules/90-incident.md` (`manual`) | `@90-incident` | User explicitly invokes. Heavyweight content with zero default cost. |
| `.windsurf/workflows/*.md` | `/<filename>` | Multi-step playbooks (release, address-PR-comments). Manual only — Cascade never auto-runs. |

## Limits to respect

| Surface | Cap |
|---|---|
| `~/.codeium/windsurf/memories/global_rules.md` | **6,000 chars** |
| Each `.windsurf/rules/*.md` | **12,000 chars** |
| Each `.windsurf/workflows/*.md` | **12,000 chars** |
| Total MCP tools exposed | **100** |

Soft ceiling: **~6k chars total `always_on` content** across all rules + AGENTS.md. Beyond that, every turn pays a tax for context that may not be relevant.

## What's deprecated and excluded

- **`.windsurfrules`** (flat root file) — soft-deprecated; current docs make no mention. New repos must use `.windsurf/rules/` + `AGENTS.md`. If you have `.windsurfrules`, migrate and delete it.
- **Windsurf "Write" vs "Chat" mode** — superseded by Cascade modes: **Code / Plan / Ask**. Toggle with `Ctrl+.` / `⌘+.`.

## See also

- [`docs/best-practices.md`](docs/best-practices.md) — the four trigger types
- [`docs/anti-patterns.md`](docs/anti-patterns.md)
- [`../../shared/principles.md`](../../shared/principles.md)
