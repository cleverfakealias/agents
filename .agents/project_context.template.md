# Project Context
<!-- Copy to .agents/project_context.md and fill in. Keep ≤120 lines.
     Assembled output (AGENTS.md) = global_core.md + this file.
     Code examples beat prose. Version specificity matters: "React 18 + Vite" > "React project".
     The <rules id="agentic-safety"> block in global_core.md applies to all agents working in this repo. -->

## Identity

- **Name**: <!-- repo name -->
- **Purpose**: <!-- one sentence -->
- **Owner**: <!-- team / person -->

## Stack

<!-- Versioned, specific, terse. -->
- **Runtime**:
- **Framework**:
- **Language**:
- **Key deps**:

## Commands

```bash
# install
# dev
# build
# typecheck
# lint
# test
# deploy
```

## Project Structure

<!-- 3-6 lines. Only the directories an agent must understand. Don't describe the whole tree. -->
```
src/
  routes/    # ← what lives here
  lib/       # ← what lives here
```

## Code Style — Project Overrides

<!-- Only deltas from global_core.md. Don't restate universal rules. Examples beat prose.
     E.g. "Use `@/components/*` import aliases, never relative `../../`." -->

## Testing

<!-- Framework, runner command, where tests live, naming convention. One example test. -->

## Git Workflow

<!-- Branch naming, commit format if non-standard, PR conventions. -->
- Branches: <!-- e.g. feat/<scope>, fix/<issue> -->
- Commits: imperative present tense (see global_core)
- PRs: <!-- template / required reviewers / etc -->

## Boundaries — Do Not Touch

<!-- Files, paths, or patterns the agent must never modify without explicit instruction. -->
- `pnpm-lock.yaml` / `package-lock.json` — never hand-edit
- Generated dirs: `dist/`, `.astro/`, `.next/`, `build/`
- Secret files: `.env*`, `.dev.vars*`, `.envrc`, `secrets.*`, `*.pem`, `*.key` — agent must not read or write; defer to user
- <!-- repo-specific: e.g. migrations/*.sql once shipped, public/legacy/* -->

## MCP Tools

<!-- If this project uses MCP servers, list them and their allowed operations.
     Agents will prefer these over raw shell commands where available. -->
<!-- e.g.
| Tool | Server | Allowed ops |
|---|---|---|
| `database` | `@modelcontextprotocol/server-postgres` | read, schema inspect |
| `filesystem` | `@modelcontextprotocol/server-filesystem` | read, write (src/ only) |
| `github` | `@modelcontextprotocol/server-github` | read PRs/issues; never push |
-->

## Environment Variables

<!-- Names only, never values. Agent proposes new names; user sets values in their secret store. -->
| Variable | Required | Notes |
|---|---|---|
| `EXAMPLE_API_KEY` | yes | local: secret loader (dotenvx / direnv / `op://`); prod: platform secret store |

## Secrets Policy

See `<rules id="secrets">` in global_core.md. Repo-specific notes only:
- Local loader: <!-- e.g. dotenvx, direnv, doppler, 1Password CLI (`op run`) -->
- Prod store: <!-- e.g. Cloudflare secrets, AWS Secrets Manager, GitHub Actions secrets -->
- Pre-commit scanner: <!-- e.g. gitleaks, trufflehog -->
