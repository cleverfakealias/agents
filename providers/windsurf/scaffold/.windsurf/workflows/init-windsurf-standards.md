---
description: Interactive setup for the Windsurf standards scaffold. Detects stack, fills AGENTS.md, prunes rules and workflows the project doesn't need. Use when user first drops the scaffold in a repo, says "set up Windsurf standards" / "init AGENTS.md" / "configure this repo for Windsurf" / "scaffold .windsurf/", or shows up in a fresh checkout with the scaffold copied in.
---

You are setting up the Windsurf standards scaffold that was just dropped into this repo. Customize `AGENTS.md`, `.windsurf/rules/`, and `.windsurf/workflows/`.

## Hard rules (apply to every step)

1. Never read `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`. If a search surfaces them, skip silently.
2. Env var names may be inferred from non-secret source files. Values never.
3. Don't invent values. Unknown placeholders stay as `<!-- ... -->` and surface in the final report.

## Step 1 — Detect stack

In parallel, look for:

- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`
- `pyproject.toml`, `uv.lock`, `requirements.txt`
- `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle*`
- `tsconfig.json`, `astro.config.*`, `next.config.*`, `vite.config.*`, `wrangler.toml`

Read matched files (skip lockfiles). Extract project name, purpose, runtime, framework, top 3-5 deps, and install/dev/test/lint/typecheck/build commands.

## Step 2 — Ask the user

1. Confirm detected identity — name, purpose.
2. Which languages does the repo use? (Determines which rules to keep.)
   - TypeScript → keep `10-typescript.md`
   - Python → keep `20-python.md`
   - Other / multiple
3. Keep `30-tests.md`?
4. Keep `40-db-migrations.md` (model_decision — only loaded when relevant)?
5. Keep `90-incident.md` (manual — `@90-incident`)?
6. Keep workflows?
   - `/release` — version bump, changelog, tag, push
   - `/address-pr-comments` — work through PR review feedback
7. Compose a one-liner for **verify command** (lint + typecheck + test). Default from detected scripts.

## Step 3 — Fill AGENTS.md

Edit the `## Project Context` block at the bottom:

- Name and stack from detection.
- Verify command from user answer.

**Do not expand AGENTS.md beyond ~3k chars.** It's `always_on` at root, so every byte costs per turn. If you need more rules, put them in `.windsurf/rules/` with a non-always_on trigger.

## Step 4 — Prune `.windsurf/rules/`

For each rule the user opted out of, delete the file. Leave `00-house-rules.md` always.

If the user has unusual conventions (different lockfile, different generated dirs), edit `00-house-rules.md` to match — but keep it ≤2k chars.

## Step 5 — Prune `.windsurf/workflows/`

For each workflow the user opted out of, delete it.

For kept workflows, customize:
- `/release` — replace `pnpm run ci:verify` with the user's verify command, replace `pnpm version` with the equivalent for the user's package manager.
- `/address-pr-comments` — usually no edits needed; uses `gh` CLI generically.

## Step 6 — Delete this workflow

This `init-windsurf-standards.md` exists only for first-time setup. After successful completion, delete it. Confirm with the user first.

## Step 7 — Report

Print:

```
✅ Windsurf scaffold initialized.

AGENTS.md filled: <line count> lines, <char count> chars
Active rules in .windsurf/rules/:
  - 00-house-rules.md (always_on)
  <list of kept rules with their triggers>

Active workflows:
  <list>

Soft ceiling check (always_on content):
  AGENTS.md: <chars> / ~3000
  00-house-rules.md: <chars> / ~2000
  Combined always_on budget: <total> chars / ~6000 soft cap

Open TODOs (placeholders remaining):
  <list>

Next steps:
  1. Commit: git add AGENTS.md .windsurf/ && git commit -m "Add Windsurf standards"
  2. (MCP) Add servers globally at ~/.codeium/windsurf/mcp_config.json — no project-level MCP config in Windsurf.
  3. Verify rules in Cascade settings (each kept rule should appear in the Rules panel).
```

## Error handling

- **Existing AGENTS.md with non-placeholder content**: ask before overwriting. Offer merge / replace (`.bak`) / skip.
- **Monorepo detected**: ask whether to scaffold root-only or per-package. Per-package can use nested `<pkg>/AGENTS.md` which Windsurf auto-promotes to a `glob` rule scoped to that subtree.
- **No stack detected**: switch to manual mode — ask name, language, verify command.
