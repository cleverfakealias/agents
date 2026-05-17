---
name: init-codex-standards
description: Interactive setup for the Codex standards scaffold in this repo. Detects stack from package.json/pyproject.toml/Cargo.toml/go.mod, fills AGENTS.md placeholders, prunes example skills the project doesn't need. Use when user first drops the scaffold into a repo, says "set up Codex standards" / "init AGENTS.md" / "scaffold .codex/" / "configure this repo for Codex" / "wire up the standards", or shows up in a fresh checkout with the scaffold copied in.
argument-hint: ""
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(ls *), Bash(cat *), Bash(pwd)
disable-model-invocation: false
model: inherit
---

# Init Codex Standards — Interactive Setup

You are setting up the Codex standards scaffold that was just dropped into this repo. The scaffold contains placeholders in `AGENTS.md` that need filling and a `.codex/config.toml` with sensible defaults.

## Hard rules (apply to every step)

- **Never read** `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`. If a glob surfaces any, skip silently.
- **Env var names** may be inferred from non-secret sources (source code, schema files). **Values never.**
- **Don't invent** values. Unknown placeholders stay as `<!-- ... -->` and surface in the final report.

## Step 1 — Detect stack

In parallel, glob for:

- `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle*`
- `tsconfig.json`, `astro.config.*`, `next.config.*`, `vite.config.*`, `wrangler.toml`, `uv.lock`

Read the matched files (skip lockfiles). Extract:

- **Name** — from `package.json.name`, `pyproject.toml [project].name`, `Cargo.toml [package].name`, `go.mod` module basename.
- **Description / purpose** — from the same files' `description`.
- **Runtime** — Node from `engines.node`, Python from `requires-python`, Rust edition, Go version.
- **Framework** — Astro / Next / Vite / React / FastAPI / Django / Flask / Spring / Actix etc.
- **Key deps** — top 3-5 by relevance.
- **Commands** — install / build / test / lint / typecheck from scripts.

## Step 2 — Confirm with the user

Plain conversation:

1. Confirm detected identity (name, purpose) or override.
2. Keep example skills?
   - `commit-and-push` — stages, writes Conventional Commits message, pushes
   - `review-diff` — reviews current branch diff
3. MCP servers — keep `github`? Add others? Remove?
4. Profile customization — confirm `model = "gpt-5.5"` default, or pick another from `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex`.

## Step 3 — Fill AGENTS.md

Edit `AGENTS.md`. Replace placeholders:

- Top summary paragraph — from detected name + description.
- `## Setup` install command.
- `## Build / Test / Lint` block — from detected scripts.
- `## Project specifics` — leave the comment placeholder for the user to fill, OR delete the section if the user has nothing to add.

**Cap AGENTS.md at 150 lines.** Each section ≤50. If you'd exceed, move detail into a future `<subdir>/AGENTS.override.md` rather than expanding root.

## Step 4 — Customize `.codex/config.toml`

- If user picked a non-default model, edit the top-level `model` line.
- For each kept MCP server, verify the env var name in `env:` matches the user's actual var.
- Remove MCP servers the user opted out of (entire `[mcp_servers.<name>]` block).

## Step 5 — Prune unwanted skills

For each opted-out skill, delete:

| Opted out | Remove |
|---|---|
| `commit-and-push` | `.codex/skills/commit-and-push/` |
| `review-diff` | `.codex/skills/review-diff/` |

## Step 6 — Delete this skill

This skill exists only for first-time setup. After successful completion, delete `.codex/skills/init-codex-standards/` so it doesn't surface every session.

Confirm with the user before deletion. Default yes.

## Step 7 — Report

```
✅ Codex scaffold initialized.

Files filled:
  - AGENTS.md (<line count> lines)
  - .codex/config.toml (model: <model>, sandbox: <sandbox>)

Active skills: <list>
Active MCP servers: <list>
Available profiles: default, review, plan, yolo (container-only)

Open TODOs in AGENTS.md:
  <list any `<!-- ... -->` remaining>

Next steps:
  1. Commit: git add AGENTS.md .codex/ && git commit -m "Add Codex standards"
  2. (Personal) Set ~/.codex/config.toml with your auth/model preferences; project config inherits.
  3. (Cloud Codex) If you use ChatGPT's Codex agent, AGENTS.md is already what it reads — no separate setup file.
  4. Activate a profile: `codex --profile review` for read-only PR review with high reasoning.
```

## Error handling

- **Existing AGENTS.md with non-placeholder content**: ask before overwriting. Offer merge / replace (`.bak`) / skip.
- **Monorepo detected**: ask whether to scaffold root-only or per-package. Default root-only; per-package can use `<pkg>/AGENTS.override.md` (rename the `.example` file in the subdir).
- **No stack detected**: switch to manual mode — ask name, language, install/build/test commands.
