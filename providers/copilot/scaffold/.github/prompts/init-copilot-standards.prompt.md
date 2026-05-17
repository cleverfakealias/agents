---
description: 'Interactive setup for the Copilot standards scaffold. Detects stack, fills copilot-instructions.md, prunes unused .instructions.md files. Use when user first drops the scaffold in a repo, says "set up Copilot standards" / "init copilot-instructions" / "configure this repo for Copilot" / "scaffold .github/", or shows up in a fresh checkout with the scaffold copied in.'
agent: 'agent'
model: 'GPT-5.2'
tools: ['search/codebase', 'edit/applyPatch', 'vscode/askQuestions', 'terminal/run']
---

# Init Copilot Standards

You are setting up the Copilot standards scaffold that was just dropped into this repo. Files to customize live under `.github/copilot-instructions.md`, `.github/instructions/`, `.github/prompts/`, `.github/agents/`, and `.github/workflows/copilot-setup-steps.yml`.

## Hard rules

- **Never read** `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`. If a search surfaces them, skip silently.
- **Env var names** may be inferred from source (`process.env.X`, `os.environ["X"]`). **Values never.**
- **Don't invent values.** Unknown placeholders stay as `<!-- ... -->` markers in the final report.

## Step 1 — Detect stack

Search the codebase for these signals (in parallel):

- `package.json`, `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json` (Node + monorepo flags)
- `pyproject.toml`, `uv.lock`, `requirements.txt`, `setup.py` (Python)
- `Cargo.toml` (Rust), `go.mod` (Go), `Gemfile` (Ruby), `composer.json` (PHP), `pom.xml` / `build.gradle*` (Java/Kotlin)
- `tsconfig.json`, `astro.config.*`, `next.config.*`, `vite.config.*`, `wrangler.toml`
- `.github/workflows/*.yml` for CI pipeline shape

From the matched files extract: project name, description, runtime version, framework, top 3-5 deps, install / dev / test / lint / typecheck / build commands.

## Step 2 — Confirm with user

Ask via VS Code chat questions:

1. **Identity** — confirm detected name + description, or override.
2. **Languages in use** — which `.instructions.md` files to keep:
   - TypeScript? (`typescript.instructions.md`)
   - Python? (`python.instructions.md`)
   - Tests? (`tests.instructions.md`)
3. **Custom agents** — keep `reviewer.agent.md` and/or `planner.agent.md`?
4. **Prompts** — keep `new-component.prompt.md` and/or `review-diff.prompt.md`?
5. **MCP servers** — which to include in `.vscode/mcp.json`? Offer: github, sentry, postgres-readonly, none.
6. **Cloud coding agent** — keep `.github/workflows/copilot-setup-steps.yml`? (Only if the user actually uses the cloud agent.)

## Step 3 — Fill `.github/copilot-instructions.md`

Replace placeholders:

- Repo summary paragraph from detected name + description.
- Setup/build/validate code block from detected commands.
- Project layout bullet list from top-level dirs (filter out `node_modules`, `dist`, `.next`, etc.).
- Coding conventions: keep the defaults; remove TypeScript / Python sections that don't apply.
- CI/CD paragraph: summarize the deploy workflows you found.
- Gotchas: leave the placeholder block — only the team knows these. Surface in final report as TODO.

**Cap the file at 150 lines.** If it's longer, move per-language rules into `.github/instructions/` and reference them.

## Step 4 — Prune unused files

For each item the user opted out of, delete:

| Opted out | Delete |
|---|---|
| TypeScript not used | `.github/instructions/typescript.instructions.md` |
| Python not used | `.github/instructions/python.instructions.md` |
| Tests rules not wanted | `.github/instructions/tests.instructions.md` |
| `reviewer` agent | `.github/agents/reviewer.agent.md` |
| `planner` agent | `.github/agents/planner.agent.md` |
| `new-component` prompt | `.github/prompts/new-component.prompt.md` |
| `review-diff` prompt | `.github/prompts/review-diff.prompt.md` |
| Cloud coding agent unused | `.github/workflows/copilot-setup-steps.yml` |
| All MCP servers | `.vscode/mcp.json` |

If user picked specific MCP servers, edit `.vscode/mcp.json` to keep only those.

## Step 5 — Adjust workflow if kept

If keeping `copilot-setup-steps.yml`, customize:

- `actions/setup-node@v4` `node-version` from detected `engines.node`.
- Add `actions/setup-python@v5` block with the detected Python version if Python is used.
- Replace `npm ci` with `pnpm install --frozen-lockfile` / `uv sync` / `cargo fetch` as appropriate.

## Step 6 — Delete this prompt

This prompt exists only for first-time setup. After successful completion, delete `.github/prompts/init-copilot-standards.prompt.md`. Confirm with the user first; default yes.

## Step 7 — Report

```
✅ Copilot scaffold initialized.

Files written:
  - .github/copilot-instructions.md (<line count> lines)
  - .github/instructions/<list>
  - .github/agents/<list>
  - .github/prompts/<list>
  - .github/workflows/copilot-setup-steps.yml (if kept)
  - .vscode/mcp.json (if kept)

Open TODOs (placeholders remaining):
  <list any `<!-- ... -->` still in the files>

Next steps:
  1. Commit: git add .github/ .vscode/ && git commit -m "Add Copilot custom instructions"
  2. (Cloud agent) Push the copilot-setup-steps.yml workflow once so Copilot can read it.
  3. (VS Code) Verify chat.useAgentsMdFile is on if you also keep AGENTS.md.
```

## Error handling

- **Existing `copilot-instructions.md` with non-placeholder content**: ask before overwriting. Offer merge / replace (`.bak` backup) / skip.
- **Monorepo detected**: ask whether to scaffold root-only or per-package. Default root-only.
- **No stack detected**: switch to manual mode — ask name, language, build/test commands.
