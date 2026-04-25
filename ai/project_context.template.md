# Project Context
<!-- Copy to .ai/project_context.md and fill in. Keep ≤120 lines.
     Assembled output (AGENTS.md) = global_core.md + this file.
     Code examples beat prose. Version specificity matters: "React 18 + Vite" > "React project". -->

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
- <!-- repo-specific: e.g. migrations/*.sql once shipped, public/legacy/* -->

## Environment Variables

<!-- Names only, never values. -->
| Variable | Required | Notes |
|---|---|---|
| `EXAMPLE_API_KEY` | yes | local: `.dev.vars`; prod: platform secret store |

## Secrets Policy

- Local: `.dev.vars` (gitignored).
- Prod: deployment platform secret store.
- Never commit, log, or echo secrets in test output.
