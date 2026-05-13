<!-- Nested AGENTS.md template.
     Place at the root of a meaningful directory (e.g. src/lib/auth/AGENTS.md).
     The AGENTS.md spec resolves nearest-ancestor wins — deeper files override shallower.
     Keep ≤30 lines. Only DELTAS from the repo-root AGENTS.md and global_core.md. Never restate universal rules. -->

# <dir>/

## Purpose

One sentence. What lives here, and why this directory exists as a unit.

## Key invariants

<!-- Local rules that load-bearing code relies on. Phrase as "must" / "never". -->

- e.g. "All public exports must come from `index.ts`."
- e.g. "Token generation routes through `issuer.ts`; never construct JWTs inline."

## Local boundaries — do not touch

<!-- Files in this dir that are off-limits without explicit instruction, with a one-line reason. -->

- `<file>` — <reason this is load-bearing>

## Entry points

<!-- The 1–3 files a new reader should open first. -->

- `<file>` — <what it does>

## Local conventions (deltas only)

<!-- Anything that differs from the repo-wide style. Skip if there are none. -->

- 

## Linked context

<!-- Optional pointers. -->

- ADRs: <ADR-NNNN>
- Intents in flight: <.agents/intents/in-flight/...>
