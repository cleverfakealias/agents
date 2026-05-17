<!--
  .github/copilot-instructions.md — auto-prepended to every Chat / agent / coding-agent request.
  Target ≤2 pages (~150 lines). Terse, declarative, imperative.

  Per GitHub's docs, this file MUST NOT contain:
  - References to other repos / external URLs
  - Persona or tone directives
  - Response-length caps
  - Format mandates (always-bulleted, etc.)
  - Task-specific instructions (those belong in .github/prompts/)

  Replace the <!-- ... --> placeholders during setup (run /init-copilot-standards).
-->

# Repo

<!-- 1-paragraph project summary, replace via init prompt -->
This is a <!-- e.g., TypeScript monorepo using pnpm workspaces -->. <!-- one sentence describing what it does -->.

## Setup, build, validate

```bash
<!-- install command, e.g., pnpm install -->
<!-- dev command, e.g., pnpm dev -->
<!-- test command, e.g., pnpm test -->
<!-- lint command, e.g., pnpm lint -->
<!-- typecheck command, e.g., pnpm typecheck -->
<!-- build command, e.g., pnpm build -->
```

Run `<!-- composite verify command, e.g., pnpm ci:verify -->` before declaring any change done.

## Project layout

- `<!-- e.g., apps/ -->` — <!-- one line describing what's here -->
- `<!-- e.g., packages/ -->` — <!-- one line -->
- `<!-- e.g., src/ -->` — <!-- one line -->

Config files: `<!-- comma-separated, e.g., tsconfig.json, package.json, vite.config.ts -->`.

## Coding conventions

- Types are mandatory. **TypeScript**: no `any`; prefer `unknown` + narrowing. Casts require an inline comment justifying the cast. **Python**: full type hints; no `Any` without justification.
- Named exports only. Default exports are unrenamable.
- Imports order: external, internal alias (`@/...`), relative, types.
- Async: `async/await`. Never leave a floating promise. Use `Promise.all` for independent work.
- Errors: narrow with `instanceof` and re-throw at the call boundary. Never `catch (e) {}`. Never log-and-continue in libraries.
- Tests: assert behavior, not implementation. One logical assertion per test. Names are sentences.

## Edit discipline

- Modify only files the task requires. No drive-by reformatting, renaming, or import reordering.
- No new dependencies without naming the alternative in stdlib / existing deps you rejected.
- No silent additions (logging, analytics, feature flags) — only what the task asks for.
- Respect `// INVARIANT:` and `// CONTRACT:` comments — never contradict them.

## Comments

- Don't add comments that restate the code.
- Add a comment only when intent isn't obvious from the signature.
- No JSDoc / docstrings for trivial getters/setters.

## Boundaries — do not touch

- Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`, `poetry.lock`, `uv.lock`) — regenerate via the package manager.
- Generated directories: `dist/`, `build/`, `.next/`, `target/`, `__pycache__/`, `node_modules/`.
- Secret files: `.env*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`. Reference env var **names** in code; values live in the platform secret store.
- `.git/`.

## Commits & PRs

- One logical change per commit.
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Imperative present tense: `"Add rate limiting to /api/ask"`.
- PR descriptions answer *why*, not *what*.
- Never push, publish, or deploy without explicit user instruction.

## Domain language & decisions

If `CONTEXT.md` exists at the repo root, read it before using project terms; update inline as terms are sharpened. If `docs/adr/` exists, read ADRs relevant to the area you're touching. Offer a new ADR only when the decision is hard to reverse, surprising without context, AND the result of a real trade-off. Both files are lazy — created on first use, not part of the scaffold.

## CI/CD

<!-- one short paragraph about how this repo deploys: GitHub Actions to Vercel? Docker → ECS? Specify what runs on PR vs. on merge -->

## Specific gotchas

<!-- non-obvious things Copilot can't infer from code:
     - "the API gateway strips trailing slashes — never include them in routes"
     - "uses pnpm, not npm — switching managers breaks the lockfile"
     - "Django settings auto-reload on file change but not on env-var change; restart manually" -->
