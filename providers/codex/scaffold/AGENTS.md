# Repository

<!-- 1-2 sentence summary. Replaced by /init-codex-standards. -->
A <!-- e.g., TypeScript monorepo using pnpm workspaces -->. <!-- One sentence describing what it does. -->

## Setup

```bash
<!-- install command, e.g., pnpm install -->
```

## Build / Test / Lint (run before declaring done)

```bash
<!-- build -->
<!-- test -->
<!-- lint -->
<!-- typecheck -->
```

Done when: all four commands above exit 0.

## Conventions

- Types are mandatory. **TypeScript**: no `any`; prefer `unknown` + narrowing; casts require an inline comment. **Python**: full type hints; no `Any` without justification.
- Named exports only.
- `type` for unions/intersections; `interface` for object shapes.
- Errors: narrow with `instanceof` and re-throw at the call boundary. Never `catch (e) {}`.
- Async: `async/await`; never floating promises; `Promise.all` for independent work.
- Imports: external, internal alias (`@/...`), relative, types.
- Tests: behavior, not implementation. One logical assertion per test. Names are sentences.

## Scope rules

- **Modify only files required by the task. No drive-by cleanup.**
- New dependencies require explicit approval — propose the package, version, and reason first; name the alternative in stdlib/existing deps you rejected.
- No silent additions (logging, analytics, feature flags).
- Respect `// INVARIANT:` and `// CONTRACT:` comments — they're load-bearing.

## Done criteria

Tests pass. Lint clean. Typecheck clean. No new dependencies without approval.

## Do NOT touch

- `.env*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `id_rsa*`, `.npmrc`, `.pypirc`.
- Lockfiles: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`, `poetry.lock`, `uv.lock` — regenerate via the package manager.
- Generated dirs: `dist/`, `build/`, `.next/`, `target/`, `__pycache__/`, `node_modules/`.
- `.git/`.

## Commits & PRs

- One logical change per commit.
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`. Imperative present tense.
- PR descriptions answer **why**, not what.
- Never `git push`, `npm publish`, or deploy commands without explicit instruction.

## Domain Language & Decisions

- **`CONTEXT.md`** (root) — domain glossary if present. One sentence per term; aliases-to-avoid surfaced. Read before using project terms; update inline when a term is sharpened. Multi-context repos: `CONTEXT-MAP.md` → per-subsystem `CONTEXT.md`.
- **`docs/adr/`** — Architecture Decision Records (`0001-slug.md` numbered). Read those relevant to the area you're touching; don't re-litigate. Offer a new ADR only when the decision is **hard to reverse, surprising without context, AND the result of a real trade-off**.

Both are lazy — they need not exist yet. Create on first use.

## Project specifics

<!-- Non-obvious things Codex can't infer from code. Examples:
  - "The API gateway strips trailing slashes — never include them in routes."
  - "Migrations land in their own commit, separate from code changes."
  - "Uses pnpm, not npm — switching managers breaks the lockfile."
Replace this comment with your team's actual gotchas, or delete the section if none.
-->
