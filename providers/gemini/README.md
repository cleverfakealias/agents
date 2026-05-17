# Gemini CLI — Optimized Scaffold

> Drop-in scaffold for [Gemini CLI](https://geminicli.com) and Gemini Code Assist agent mode. Tuned for the 2026 nested-context-file system, TOML slash commands, and the `context.fileName` config that lets one `AGENTS.md` serve Gemini alongside Claude / Codex / Cursor / Windsurf.

## What's in this folder

```
gemini/
├── README.md
├── docs/
│   ├── best-practices.md
│   └── anti-patterns.md
└── scaffold/                            ← drop into your target repo
    ├── AGENTS.md                        ← cross-tool contract; Gemini reads via context.fileName
    ├── GEMINI.md                        ← optional — only if you want a Gemini-only memory file
    └── .gemini/
        ├── settings.json                ← model, sandbox, context.fileName, mcpServers
        ├── .geminiignore                ← filter for JIT-loaded nested GEMINI.md
        ├── .env.example                 ← env-var template (gitignore the real .env)
        └── commands/                    ← TOML slash commands
            ├── init.toml                ← interactive setup: /init
            ├── git/commit.toml          ← /git:commit
            ├── test/run.toml            ← /test:run
            └── review.toml              ← /review
```

## Install into a target repo

```bash
cp -r providers/gemini/scaffold/. /path/to/your-repo/
```

Then in Gemini CLI, run:

```
/init
```

The TOML command walks you through detecting your stack, customizing `AGENTS.md` / `GEMINI.md`, and pruning commands you don't need.

## Why this layout

| Surface | Used for | Why |
|---|---|---|
| `AGENTS.md` (preferred) | Cross-tool contract | Listed first in `.gemini/settings.json` `context.fileName` array. Tool-portable. |
| `GEMINI.md` (optional) | Gemini-only memory | Generally skip — `AGENTS.md` covers the same ground. Use if you have Gemini-specific instructions. |
| Nested `<subdir>/GEMINI.md` | JIT context for specific areas | Loaded only when Gemini reads files in that dir. Unique to Gemini — exploit it for monorepos. |
| `.gemini/settings.json` | Model, sandbox, context filename, MCP, file filtering | Nested schema (2026) — `tools.sandbox`, `security.toolSandboxing`, `checkpointing.enabled`. |
| `.gemini/commands/*.toml` | Slash commands (TOML, not Markdown) | Subfolder = namespace (`commands/git/commit.toml` → `/git:commit`). |
| `.geminiignore` | Separate from `.gitignore` | Filters JIT context loading. Critical for monorepos with many nested context files. |

## What's distinctive about Gemini

- **JIT context loading.** A `packages/api/GEMINI.md` is only loaded when Gemini reads files under `packages/api/`. Massive win for monorepos vs. tools that always-load all context.
- **TOML commands** (not Markdown). The `prompt` field is a triple-quoted string with `{{args}}`, `!{bash}`, `@{file}` interpolation.
- **Header hierarchy matters.** Gemini navigates long context by `#`/`##`/`###`. Skipping levels measurably degrades instruction following.
- **`AGENTS.md` support via config.** Set `context.fileName: ["AGENTS.md", "GEMINI.md"]` and one canonical file serves multiple tools.

## See also

- [`docs/best-practices.md`](docs/best-practices.md)
- [`docs/anti-patterns.md`](docs/anti-patterns.md)
- [`../../shared/principles.md`](../../shared/principles.md)
