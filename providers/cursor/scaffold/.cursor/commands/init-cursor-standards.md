You are setting up the Cursor standards scaffold that was just dropped into this repo. Customize `.cursor/rules/`, `.cursor/commands/`, `.cursor/mcp.json`, `.cursor/environment.json`, and `AGENTS.md`.

## Hard rules (apply to every step)

- Never read `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`. Skip if surfaced.
- Env var names may be inferred from source code. Values never.
- Don't invent values. Leave unknown placeholders as `<!-- ... -->` and report them.

## Step 1 — Detect stack

In parallel, look for:

- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`
- `pyproject.toml`, `uv.lock`, `requirements.txt`
- `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle*`
- `tsconfig.json`, `astro.config.*`, `next.config.*`, `vite.config.*`, `wrangler.toml`

Extract: project name, purpose, runtime, framework, top 3-5 deps, install/dev/test/lint/typecheck/build commands.

## Step 2 — Ask the user

1. Confirm detected identity (name, purpose, owner) or override.
2. Which languages does the repo use? (Determines which `.mdc` files to keep.)
   - TypeScript → keep `10-typescript.mdc`
   - Python → keep `20-python.mdc`
   - Other / multiple
3. Keep `30-tests.mdc`?
4. Keep `40-db-migrations.mdc`?
5. Keep `99-security-review.mdc` (manual; invoked via `@99-security-review`)?
6. Keep example commands (`open-pr.md`, `write-tests.md`, `fix-lint.md`)?
7. MCP servers — keep `github`? Add others? Or remove `.cursor/mcp.json` entirely?
8. Background / Cloud Agents — keep `.cursor/environment.json`?

## Step 3 — Fill `AGENTS.md`

Replace the `## Project Context` block at the bottom:

- Name, purpose, owner from user answers.
- Stack one-liner: synthesized from detection (e.g., "Next.js 16 + TypeScript 5.5 + pnpm").
- Commands block: fill from detected scripts.

Don't expand `AGENTS.md` beyond ~150 lines. The default scaffold is already tuned for that ceiling.

## Step 4 — Prune `.cursor/rules/`

For each rule file the user opted out of, delete it. Leave `00-house.mdc` in place — it's always-on cross-cutting and applies to every project.

If the user has unusual conventions (different lockfile, different generated dirs), edit `00-house.mdc` to match. Otherwise leave it alone.

## Step 5 — Customize commands

For each kept command in `.cursor/commands/`:

- `open-pr.md` — swap `pnpm lint && pnpm test` for the actual verify command from detection.
- `write-tests.md` — swap the test runner reference (Vitest / Jest / pytest / cargo test).
- `fix-lint.md` — swap the lint command (eslint / ruff / clippy / golangci-lint).

For commands the user opted out of, delete the file.

## Step 6 — Customize MCP / environment

`.cursor/mcp.json`:
- Keep only the servers the user picked. If none, delete the file.
- For each kept server, verify env var names match what the user actually has set (don't invent new env vars; surface them in the final report).

`.cursor/environment.json`:
- If kept, swap `install:` to the detected install command (`pnpm install --frozen-lockfile`, `uv sync`, `cargo fetch`, etc.).
- Customize `terminals[]` for the user's dev workflow (or remove if they don't use background agents).
- If not kept, delete the file.

## Step 7 — Delete this command

This `init-cursor-standards.md` exists only for first-time setup. After successful completion, delete it. Confirm with the user first.

## Step 8 — Report

```
✅ Cursor scaffold initialized.

Active rules in .cursor/rules/:
  - 00-house.mdc (alwaysApply)
  <list of kept rules>

Active commands:
  - <list>

MCP servers: <list or "none">
Cloud agent env: <kept | removed>

AGENTS.md filled: <line count> lines

Open TODOs (placeholders still in files):
  <list>

Next steps:
  1. Commit: git add AGENTS.md .cursor/ && git commit -m "Add Cursor standards"
  2. (Cloud agents) Set repo secrets at cursor.com/dashboard/cloud-agents
  3. Verify rule activation in Cursor: Settings → Rules should list all kept .mdc files
```

## Error handling

- **Existing `AGENTS.md` with non-placeholder content**: ask before overwriting. Offer merge / replace (`.bak`) / skip.
- **Monorepo detected**: ask whether to scaffold root-only or per-package. Default root-only; per-package can use nested `<pkg>/AGENTS.md` later.
- **No stack detected**: switch to manual mode — ask name, language, build/test commands.
