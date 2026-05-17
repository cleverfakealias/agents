---
name: review-pr
description: Review a PR (current branch by default, or `[pr-number]`) for correctness, security, scope discipline, and test coverage. Use when user says "review this PR" / "code review" / "look over this branch" / "any issues before I merge" / "what's wrong with this diff", or wants a pre-merge check. Delegates to the security-reviewer subagent if auth / input-handling / query code changed.
argument-hint: "[pr-number]"
allowed-tools: Bash(gh pr *), Bash(gh api *), Bash(git diff*), Bash(git log*), Bash(git branch*), Read, Grep, Glob
disable-model-invocation: false
model: inherit
---

# Review PR

## Get the diff

- If `$ARGUMENTS` is a number: `gh pr diff $ARGUMENTS`.
- Else: `git diff $(git merge-base HEAD main)..HEAD` (or `master`/`develop` if `main` doesn't exist).

Cap initial read at 800 lines. For larger diffs, list files first (`gh pr view --json files`) and review the riskiest first: auth, validators, query construction, migrations, public APIs.

## Review pass — categorize findings

For each issue, label severity and report as `severity: file:line — issue — fix`:

| Severity | Threshold |
|---|---|
| **BLOCKER** | Bug, security issue, data loss, contract violation. Must fix before merge. |
| **MAJOR** | Wrong abstraction, scope creep, missing tests on a critical path. Should fix. |
| **MINOR** | Style, naming, comment quality. Nice to fix. |
| **NIT** | Personal preference. Mention once, move on. |

Cap report at 30 items. If you'd exceed that, surface the top 30 and note "N more issues elided — narrow scope to a subdir to see them."

## What to check

- **Correctness**: does the code do what the PR description claims? Run a mental simulation on edge cases (null, empty, max, concurrent).
- **Edit discipline** (`<rules id="edit-discipline">` in AGENTS.md): scope creep, drive-by refactors, cosmetic churn, new deps with no justification.
- **Types**: `any`, unjustified casts, swallowed errors (`catch (e) {}`).
- **Async**: floating promises, sequential awaits in loops where `Promise.all` fits.
- **Security**: input validation at boundaries, SQL/HTML/shell injection sinks, secrets in code, unsafe deserialization, SSRF, missing authz checks.
- **Tests**: are new code paths covered? Are tests asserting behavior or implementation?
- **Migration safety**: if SQL/Prisma/Alembic touched — reversible? Concurrent-safe? Two-step for destructive ops?

## Delegate when worth it

If auth, input validation, query construction, or crypto code changed:
delegate to the `security-reviewer` subagent (capped tools, read-only). Pass it the specific files and ask for security-only findings.

Don't delegate trivial reviews — the round-trip costs more than it saves.

## Final output

```
PR review for <branch or #PR>
Files changed: <N>  Lines: +<adds> -<dels>

BLOCKERS (must fix before merge):
  - <severity>: <file:line> — <issue> — <fix>
MAJOR:
  - ...
MINOR / NIT:
  - ...

Test coverage gaps:
  - ...

Verdict: <approve | request changes | comment>
```

## Cross-skill referrals

After listing findings, recommend a follow-up skill if one matches — don't run it, just suggest:

- **Architectural friction** (tightly coupled modules, no testable seam, shallow modules per `improve-codebase-architecture/LANGUAGE.md` — "deletion test"): "Consider `/improve-codebase-architecture` on the <area> before merge."
- **Hard-to-reproduce bug pattern** (intermittent failure, no regression test, missing seam to lock the fix down): "Consider `/diagnose` to build a feedback loop and a regression test."
- **Vocabulary drift** (PR introduces new domain terms not in `CONTEXT.md`, or contradicts existing ones): "Consider `/grill-with-docs` to reconcile terms in `CONTEXT.md`."
- **Load-bearing decision with no record** (the PR encodes a trade-off that's hard to reverse and surprising): "Consider an ADR in `docs/adr/` — see `grill-with-docs/ADR-FORMAT.md` for the three-test gate."

Only suggest when the trigger is clearly met — over-suggesting trains the user to ignore the section.

## Hard never

- Approve without reading the diff.
- "LGTM" without listing what you actually checked.
- Make edits during a review — file findings, don't apply them.
