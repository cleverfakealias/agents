---
name: init-claude-standards
description: Interactive setup for the Claude Code standards scaffold in this repo. Auto-detects stack from package.json/pyproject.toml/Cargo.toml/go.mod, fills CLAUDE.md and AGENTS.md placeholders, prunes example hooks and skills the project doesn't need. Use when user first drops the scaffold into a repo, says "set up Claude standards" / "init CLAUDE.md" / "scaffold .claude/" / "configure this repo for Claude" / "wire up the standards", or shows up in a fresh checkout with the scaffold copied in.
argument-hint: ""
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(ls *), Bash(cat *), Bash(pwd), Bash(node -*), Bash(uv --version), Bash(cargo --version), Bash(go version), Bash(claude --version)
disable-model-invocation: false
model: inherit
---

# Init Claude Standards — Interactive Setup

You are setting up the Claude Code standards scaffold in this repository. The scaffold was just copied in from `providers/claude/scaffold/` of the `agents` template repo and contains placeholders that need filling.

## Hard rules (apply to every step)

- **Never read** `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`. If a glob surfaces any, skip silently.
- **Variable names** may be inferred from non-secret sources (`process.env.X` in source code, schema files, `wrangler.toml` `[vars]` keys). **Values never.**
- **Do not invent** values. If a placeholder can't be filled from detection or user answers, leave it as `<!-- ... -->` and surface it in the final report.

## Step 0 — Detect Claude Code version

Run `claude --version` once. Parse the output (format: `claude-code/<version>`). Record:

- `< 2.1.0`: legacy. Skip the auto-memory subsection of CLAUDE.md (the user's binary doesn't support `~/.claude/projects/<path>/memory/`).
- `< 2.1.59`: skills work but not auto-discovery of newly-added skills mid-session. Note in the final report: "Restart Claude Code after first commit for skills to be discoverable."
- `>= 2.1.59`: full feature set assumed. Default path.

If `claude --version` fails or is missing from `$PATH`, assume the latest behavior and note "Could not detect Claude Code version — assuming current."

## Step 1 — Detect stack

Run these in parallel:

- `Glob` for `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle*` at the repo root.
- `Glob` for `tsconfig.json`, `astro.config.*`, `next.config.*`, `vite.config.*`, `wrangler.toml`, `uv.lock`, `requirements.txt`.

Read the matched files (skip lockfiles). Extract:

- **Name** — from `package.json.name`, `pyproject.toml [project].name`, `Cargo.toml [package].name`, `go.mod` module path basename.
- **Description / purpose** — from the same files' `description` field, if present.
- **Runtime** — Node version from `engines.node`, Python version from `requires-python`, Rust edition, Go version.
- **Framework** — Astro / Next / Vite / React / FastAPI / Django / Flask / Spring / Actix / Tokio etc. from dep lists.
- **Key deps** — top 3-5 dependencies by relevance (framework, ORM, validator, test runner).
- **Commands** — from `package.json.scripts`, `pyproject.toml [tool.*]`, `Cargo.toml` aliases. Map to install / dev / build / test / lint / typecheck.

If no config file matches: skip to Step 2 and ask the user.

## Step 2 — Confirm with the user

Use `AskUserQuestion` with detected values pre-filled. Sample shape:

```
Question: "Project identity — confirm or edit"
Header: "Identity"
multiSelect: false
Options:
  1. "<detected name> — <detected purpose>"
     Description: "Use detected values"
  2. "Edit name/purpose/owner"
     Description: "I'll override the detected values"
```

If they pick edit, ask name / purpose / owner as three separate questions.

Then ask:
- Branch convention (`feat/<scope>` is the default).
- Issue tracker (GitHub Issues / Linear / `.scratch/` markdown / none). Used by `/to-prd`, `/to-issues`, `/triage`. Default: GitHub Issues if `.github/` exists and `gh auth status` works.
- Whether to keep example skills (`commit-and-push`, `review-pr`).
- Whether to keep the adapted-skill bundles (default: keep all):
  - **Spec set**: `grill-with-docs`, `to-prd`, `to-issues`, `zoom-out`
  - **Build set**: `tdd`, `diagnose`, `prototype`
  - **Architecture**: `improve-codebase-architecture`
  - **Workflow**: `triage`, `handoff`
- Whether to keep the example subagent (`security-reviewer`).
- Whether to add MCP servers (offer: github, sentry, postgres-readonly, "none for now").

## Step 3 — Fill CLAUDE.md

Edit `CLAUDE.md` with `Edit` tool. Replace the placeholder block under `## Claude-Code specifics for this repo`:

- `<!-- e.g., pnpm, uv, cargo — fill from detection -->` → detected package manager.
- `<!-- e.g., pnpm run ci:verify — runs lint + typecheck + test -->` → composite verify command (concat lint + typecheck + test from scripts, or the existing `verify` / `ci:verify` script if present).
- `<!-- e.g., feat/<scope>, fix/<scope> -->` → user's answer.
- `<!-- e.g., GitHub Issues, Linear, .scratch/ markdown — used by /to-prd, /to-issues, /triage -->` → user's answer; default to "GitHub Issues" when `.github/` exists and `gh auth status` succeeds.
- Skills list: remove categories the user opted out of (commit-and-push, review-pr, spec set, build set, architecture, workflow).
- If Step 0 detected `< 2.1.0`: delete the **`## Memory & context`** section's auto-memory paragraph (the one referencing `~/.claude/projects/<path>/memory/`). Keep the `CONTEXT.md` / `docs/adr/` paragraph — those work regardless of version.

## Step 4 — Fill AGENTS.md

Edit `AGENTS.md`. Replace the `# Project Context` block:

- `<!-- repo name -->`, `<!-- one sentence -->`, `<!-- team or person -->`.
- Stack section: runtime / framework / language / key deps from detection.
- Commands code block: install / dev / test / lint / typecheck / build commands as inline `bash` lines.
- Project Structure: detected directories (src/, app/, lib/, tests/, etc.) — keep concise, ≤8 lines.
- Boundaries: keep the defaults; add monorepo-specific paths only if detected (`packages/`, `apps/`).

Cap the assembled `AGENTS.md` at 250 lines. Cap `CLAUDE.md` at 200 lines.

## Step 5 — Prune unwanted scaffold pieces

For each item the user opted out of, delete:

| Opted out | Remove path |
|---|---|
| `commit-and-push` skill | `.claude/skills/commit-and-push/` |
| `review-pr` skill | `.claude/skills/review-pr/` |
| `security-reviewer` subagent | `.claude/agents/security-reviewer.md` |
| All MCP servers | `.mcp.json` |
| Spec set | `.claude/skills/{grill-with-docs,to-prd,to-issues,zoom-out}/` |
| Build set | `.claude/skills/{tdd,diagnose,prototype}/` |
| Architecture | `.claude/skills/improve-codebase-architecture/` |
| Workflow | `.claude/skills/{triage,handoff}/` |

If you delete every skill in the spec/build/architecture/workflow bundles, also delete `.claude/skills/NOTICES.md` (it only credits those skills).

If they chose specific MCP servers, edit `.mcp.json` to keep only those. If they chose "none for now", delete the file.

## Step 6 — Delete this skill

This skill exists only for first-time setup. After successful completion, delete `.claude/skills/init-claude-standards/` so it doesn't clutter the skill list every session.

Confirm with the user before deletion: "Setup complete. Delete the init skill (it's done its job)?" Default yes.

## Step 7 — Report

Print a single block:

```
✅ Claude scaffold initialized.

Files filled:
  - CLAUDE.md (<line count> lines)
  - AGENTS.md (<line count> lines)

Active skills: <list>
Active subagents: <list>
Active hooks: block-secret-writes, block-destructive-bash, lint-after-edit
Permission deny rules: <count>

Open TODOs in CLAUDE.md or AGENTS.md:
  <list any remaining <!-- ... --> placeholders>

Next steps:
  1. Commit: git add CLAUDE.md AGENTS.md .claude/ .mcp.json && git commit -m "Add Claude Code standards"
  2. Make hooks executable on this machine if not already: chmod +x .claude/hooks/*.sh
  3. (Optional) Copy .claude/settings.local.json.example → .claude/settings.local.json for personal overrides; gitignore it.
```

## Error handling

- **Multiple stacks detected (monorepo)**: ask the user which package this scaffold targets, OR offer to scaffold root-only and leave per-package context to nested `<pkg>/CLAUDE.md` later.
- **No detectable stack**: switch to manual mode — ask name / purpose / language / commands directly.
- **User aborts mid-setup**: do not leave partially-edited files. Either revert your edits or leave the placeholders intact. Never write a half-filled `AGENTS.md`.
- **A `CLAUDE.md` or `AGENTS.md` already exists with non-placeholder content**: ask before overwriting. Options: merge (keep their edits, fill remaining `<!--  -->` only), replace (back up `.bak`), skip.
