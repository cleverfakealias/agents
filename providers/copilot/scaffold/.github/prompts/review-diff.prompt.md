---
description: 'Review the current branch diff for correctness, security, scope, and tests. Output findings only — no edits. Use when user says "review this diff" / "code review" / "look over this branch" / "any issues before I merge" / "what is wrong here", or wants a pre-merge check.'
agent: 'Reviewer'
model: 'Claude Opus 4.5'
tools: ['search/codebase', 'terminal/run']
---

Review the diff between the current branch and `main` (or `master` / `develop` if `main` is absent).

Get the diff with `git diff $(git merge-base HEAD main)..HEAD`. Cap initial read at 800 lines. For larger diffs, list files first and review the riskiest first: auth, validators, query construction, migrations, public APIs.

For each finding, output one line:

```
<severity>: <file:line> — <issue> — <fix>
```

Severities:
- **BLOCKER** — bug, security issue, data loss, contract violation. Must fix.
- **MAJOR** — wrong abstraction, scope creep, missing tests on a critical path.
- **MINOR** — style, naming, comment quality.
- **NIT** — preference.

Check for:
- Correctness — does the code do what the PR claims? Mental-simulate edge cases.
- Edit discipline — scope creep, drive-by refactors, cosmetic churn, new deps without justification.
- Types — `any`, unjustified casts, swallowed errors.
- Async — floating promises, sequential awaits where parallel fits.
- Security — input validation, injection sinks, secrets in code, unsafe deserialization, SSRF.
- Tests — new code paths covered? Tests assert behavior?
- Migrations (if SQL/Prisma/Alembic touched) — reversible? Concurrent-safe? Two-step for destructive ops?

End with:

```
Verdict: BLOCK | REQUEST CHANGES | OK
```

Cap at 30 findings. No praise. No restating the diff.
