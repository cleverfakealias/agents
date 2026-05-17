# OpenAI Codex — Optimized Scaffold

> Drop-in scaffold for [OpenAI Codex CLI](https://github.com/openai/codex) and the **ChatGPT Codex cloud agent**. Tuned for the 2026 model — `AGENTS.md` is canonical (Codex was a launch member of the spec), Skills replace deprecated custom prompts, profiles drive deterministic sandboxing.

## What's in this folder

```
codex/
├── README.md
├── docs/
│   ├── best-practices.md
│   └── anti-patterns.md
└── scaffold/                              ← drop into your target repo
    ├── AGENTS.md                          ← root: ≤150 lines, sections ≤50
    ├── AGENTS.override.md.example         ← per-subdir overrides (rename in subdirs)
    └── .codex/
        ├── config.toml                    ← pinned model, sandbox, MCP, profiles
        └── skills/
            ├── init-codex-standards/SKILL.md   ← interactive setup (replaces deprecated prompts)
            ├── commit-and-push/SKILL.md
            └── review-diff/SKILL.md
```

You will also want, at the user level (not committed):
```
~/.codex/config.toml                       ← personal defaults; project config inherits from here
```

## Install into a target repo

```bash
cp -r providers/codex/scaffold/. /path/to/your-repo/
```

Then in Codex CLI:

```
codex
# inside the session:
> use the init-codex-standards skill to set up this repo
```

The skill detects your stack, fills `AGENTS.md`, and prunes example skills you don't need.

## Why this layout

| Surface | Used for | Why |
|---|---|---|
| `AGENTS.md` (root) | Canonical contract | Codex was a launch member of the AGENTS.md spec (Aug 2025). Plain Markdown, no frontmatter. Cap ≤150 lines, sections ≤50 lines — Codex retrieval degrades beyond that. |
| `<subdir>/AGENTS.override.md` | Per-service deltas | Concatenated root → CWD; closer wins. Use for service-specific test commands, framework conventions, "do not touch" lists. |
| `.codex/config.toml` (project, committed) | Pinned model, sandbox, profiles, MCP | Trusted-project config. Pins identical behavior across all contributors. **Never commit secrets** — reference env var names only. |
| `~/.codex/config.toml` (user, NOT committed) | Personal defaults | Project config inherits. Put personal API keys / preferred model here, not in the project. |
| `.codex/skills/<name>/SKILL.md` | Repo-shareable skills | Skills travel with the repo and trigger automatically. **Custom prompts (`~/.codex/prompts/`) are deprecated** — use skills for new work. |

## What's deprecated and excluded

- **Custom prompts (`~/.codex/prompts/*.md`)** — deprecated 2026. They live only in user scope (never travel with the repo) and require `/prompts:name` invocation. Skills replace them.
- **`.cursorrules` / `.windsurfrules` / `CLAUDE.md` consumption** — Codex reads only `AGENTS.md`. If you have other tool files, they're ignored.

## Sandbox & approval defaults

The shipped `config.toml` uses the conservative laptop default: `sandbox_mode = "workspace-write"` + `approval_policy = "on-request"`. Override per-task with profiles:

```bash
codex --profile review       # read-only sandbox, gpt-5.3-codex high reasoning
codex --profile yolo         # container/VM ONLY — workspace-write, no approvals
```

## See also

- [`docs/best-practices.md`](docs/best-practices.md)
- [`docs/anti-patterns.md`](docs/anti-patterns.md)
- [`../../shared/principles.md`](../../shared/principles.md)
