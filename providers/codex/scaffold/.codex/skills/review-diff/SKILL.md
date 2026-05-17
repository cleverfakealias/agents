---
name: review-diff
description: Review the current branch diff against main for correctness, security, scope discipline, and test coverage. Output is findings only — no edits. Use when user says "review this diff" / "code review" / "look over this branch" / "any issues before I merge" / "what's wrong here", or wants a pre-merge check.
argument-hint: "[base-branch, defaults to main]"
allowed-tools: Bash(git diff*), Bash(git log*), Bash(git merge-base*), Bash(git branch*), Read, Grep, Glob
disable-model-invocation: false
model: inherit
---

# Review Diff

## Get the diff

Default base is `main`. If `main` doesn't exist, try `master`, then `develop`. Or use `$ARGUMENTS` if provided.

```bash
git diff $(git merge-base HEAD <base>)..HEAD
```

Cap the initial read at 800 lines. For larger diffs, list files first (`git diff --stat`) and review the riskiest first: auth, validators, query construction, migrations, public APIs.

## What to check

| Area | Look for |
|---|---|
| **Correctness** | Does the code do what the PR claims? Mental-simulate edge cases (null, empty, max, concurrent). |
| **Edit discipline** | Scope creep, drive-by refactors, cosmetic churn, new deps without justification. |
| **Types** | `any`, unjustified casts, swallowed errors (`catch (e) {}`). |
| **Async** | Floating promises, sequential awaits in loops where `Promise.all` fits. |
| **Security** | Input validation at boundaries, SQL/HTML/shell injection sinks, secrets in code, unsafe deserialization, SSRF, missing authz. |
| **Tests** | New code paths covered? Tests assert behavior, not implementation? |
| **Migrations** (if touched) | Reversible? Concurrent-safe? Two-step for destructive ops? |

## Output

One line per finding:

```
<severity>: <file:line> — <issue> — <fix>
```

Severities:
- **BLOCKER** — bug, security issue, data loss, contract violation. Must fix.
- **MAJOR** — wrong abstraction, scope creep, missing tests on critical path.
- **MINOR** — style, naming, comment quality.
- **NIT** — preference.

Cap at 30 findings. End with:

```
Verdict: BLOCK | REQUEST CHANGES | OK
```

## Hard never

- Apply fixes. You are read-only — file findings, don't edit.
- "LGTM" without listing what you actually checked.
- Praise. No "great work", no "looks good overall".
- Restate the diff. The reviewer reads it themselves.
