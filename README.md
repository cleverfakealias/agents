# agents — per-provider AI agent scaffolds

> A collection of **highly-optimized, hand-tuned scaffolds** for the major AI coding agents — one folder per provider, each using that provider's **native idioms** end-to-end.
>
> Pick the provider you use, copy its `scaffold/`, run its native init mechanism, ship.

## Why this exists

There's no shortage of "AI agent rules" templates. Almost all of them lean into a least-common-denominator format — one big `AGENTS.md` everyone reads, plus a handful of identical small shims for each tool. That works, but it never gets the **best** out of any one tool.

This repo takes the opposite approach: each provider gets a **complete, opinionated scaffold** built on its 2026-current best practices, with full use of its native machinery — hooks, skills, custom commands, profiles, sandbox configs, MCP, all of it. No "mix-bag" shims.

## Providers

| Folder | For | Init mechanism |
|---|---|---|
| [`providers/claude/`](providers/claude/) | [Claude Code](https://code.claude.com) | Skill: `/init-claude-standards` |
| [`providers/copilot/`](providers/copilot/) | [GitHub Copilot](https://docs.github.com/en/copilot) (VS Code + cloud coding agent) | Prompt file: `/init-copilot-standards` |
| [`providers/cursor/`](providers/cursor/) | [Cursor](https://cursor.com) | Custom command: `/init-cursor-standards` |
| [`providers/gemini/`](providers/gemini/) | [Gemini CLI](https://geminicli.com) | TOML command: `/init` |
| [`providers/codex/`](providers/codex/) | [OpenAI Codex CLI](https://github.com/openai/codex) (+ ChatGPT cloud Codex) | Skill: `init-codex-standards` |
| [`providers/windsurf/`](providers/windsurf/) | [Windsurf](https://windsurf.com) | Workflow: `/init-windsurf-standards` |

Each provider folder contains:
- `README.md` — what's in the folder, how to install
- `docs/best-practices.md` — concise, citation-backed field guide
- `docs/anti-patterns.md` — what NOT to do (per the provider's own docs)
- `scaffold/` — the drop-in template (copy contents into your target repo)

## Shared

[`shared/principles.md`](shared/principles.md) — the **canonical rule set** every provider's scaffold expresses in its own native idiom. Source of truth for whoever edits the scaffolds; **not** consumed by AI agents at runtime.

## Use it

Pick a provider, copy its scaffold, run its init mechanism:

```bash
# Claude Code
cp -r providers/claude/scaffold/. /path/to/your-repo/
cd /path/to/your-repo
# Open Claude Code, run: /init-claude-standards

# GitHub Copilot (VS Code)
cp -r providers/copilot/scaffold/. /path/to/your-repo/
# In Copilot Chat: /init-copilot-standards

# Cursor
cp -r providers/cursor/scaffold/. /path/to/your-repo/
# In Cursor Agent: /init-cursor-standards

# Gemini CLI
cp -r providers/gemini/scaffold/. /path/to/your-repo/
gemini
> /init

# OpenAI Codex
cp -r providers/codex/scaffold/. /path/to/your-repo/
codex
> use the init-codex-standards skill

# Windsurf
cp -r providers/windsurf/scaffold/. /path/to/your-repo/
# In Cascade chat: /init-windsurf-standards
```

Each init mechanism detects your stack from `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / etc., fills the scaffold's placeholders, prunes the example skills/rules/prompts you don't want, and self-destructs.

## Use more than one

The scaffolds are designed to **coexist cleanly**. Most of them use `AGENTS.md` as a shared cross-tool contract (Claude imports it via `@AGENTS.md`, Cursor / Codex / Windsurf read it natively, Gemini reads it via `context.fileName`, Copilot reads it since 2025-08). The provider-specific surfaces (`.claude/`, `.cursor/`, `.gemini/`, `.codex/`, `.windsurf/`, `.github/copilot-instructions.md`) don't collide.

If you use Claude Code in the terminal and Cursor in the IDE, copy both scaffolds and the `AGENTS.md` files will overwrite cleanly — they're substantively the same; the per-provider files are additive.

## Layout

```
agents/                                  ← this repo
├── README.md                            ← you are here
├── AGENTS.md / CLAUDE.md / llms.txt     ← this repo's own contract (dogfooded)
├── shared/
│   ├── README.md
│   └── principles.md                    ← canonical rule set, source of truth
├── providers/
│   ├── claude/   { README.md, docs/, scaffold/ }
│   ├── copilot/  { README.md, docs/, scaffold/ }
│   ├── cursor/   { README.md, docs/, scaffold/ }
│   ├── gemini/   { README.md, docs/, scaffold/ }
│   ├── codex/    { README.md, docs/, scaffold/ }
│   └── windsurf/ { README.md, docs/, scaffold/ }
└── legacy/
    ├── README.md                        ← what this is, why it was deprecated
    └── .agents/                         ← pre-split multi-provider scaffold (reference only)
```

## What's NOT here

- **Shims.** The legacy `.agents/shims/<model>.md` approach (small overrides on a shared `global_core.md`) is preserved in `legacy/` but not extended. Each provider now has a full optimized scaffold instead.
- **Cross-provider unification.** No build step. No "assembled AGENTS.md from global_core + project_context". Each provider's scaffold stands alone.
- **Runtime tooling.** This is a template repo — no CI, no tests for the scaffolds themselves beyond the manual "copy into a sample repo, run init, verify outputs" pass.

## License

Personal template — fork freely, customize for your team's rules, and share.
