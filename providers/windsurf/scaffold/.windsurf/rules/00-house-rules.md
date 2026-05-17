---
trigger: always_on
---

# House Rules (always-on, ≤2k chars)

- Never edit lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`, `poetry.lock`, `uv.lock`) — regenerate via the package manager.
- Never edit generated dirs (`dist/`, `build/`, `.next/`, `target/`, `__pycache__/`, `node_modules/`).
- Never read secret files (`.env*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `id_rsa*`, `.npmrc`, `.pypirc`). Reference env var **names** only.
- Never run `git push`, `npm publish`, deploy commands, or `--force` operations without explicit user instruction.
- One logical change per commit. Conventional Commits format.
- Scope lock: only files the task requires. No drive-by reformat/rename.
- If `CONTEXT.md` exists at root, read it before using project terms; update inline when a term is sharpened. If `docs/adr/` exists, read ADRs in the area you're touching; offer a new ADR only when the decision is hard to reverse, surprising without context, AND the result of a real trade-off.
