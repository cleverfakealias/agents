---
name: factory
description: Entry point of the software factory, which takes an idea through spec, build, review and ship with a person at each gate. Use when the user says "factory", asks to build a feature end to end, or asks where a spec stands. Shows the state of specs/ and starts the next stage. Not for quick fixes or questions.
argument-hint: "[idea | spec slug]"
---

# Software factory

One feature moves through five stages. Each stage has its own skill, writes its
result into `specs/<slug>/`, and ends at a gate. A fresh session can pick up
any feature from those files alone.

| Stage | Skill | Output | Gate (a person decides) |
| :- | :- | :- | :- |
| 1. Spec | `/factory:spec` | requirements, plan, tasks, status | approve the spec |
| 2. Build | `/factory:build` | branch with tests first, then code | verifier PASS |
| 3. Review | `/factory:review` | confirmed findings, fixed | accept the review |
| 4. Ship | `/factory:ship` | PR, CI green, preview URL | merge, then production |
| 5. Learn | part of ship | Lessons, proposed AGENTS.md edits | accept the edits |

`stage:` in `specs/<slug>/status.md` says where a feature is: `spec`,
`approved`, `build`, `review`, `ship`, `done` or `parked`.

## What to do now

1. With no argument: list the features under `specs/` with their stage, branch
   and the "Where to resume" line. Ask which one to continue, or what to start.
2. With an idea: say which size it is.
   - **Quick fix** (one file, obvious): skip the factory and just do it.
   - **Feature**: run `/factory:spec` with the idea.
3. With a slug: read its `status.md`, then run the skill for that stage.
   `spec` or `approved` goes to spec or build, `build` to build, and so on.

## Rules for every stage

- **The spec is the source of truth.** If the work must differ from it, change
  the spec first and tell the user. Never let code and spec drift apart.
- **One feature, one branch, one PR.** The branch is `feat/<slug>` unless the
  repository names another pattern.
- **Separate makers from checkers.** The agent that writes code never grades
  it. Tests come from `factory:test-author`, grades from `factory:verifier` and the review
  workflow.
- **Gates are the user's.** Approving the spec, merging, and deploying to
  production need the user's words in this chat. Pushing and opening a PR are
  asked once per feature.
- **Update status.md at every stage change** (stage, log line, where to
  resume). Keep it short; it is what the next session reads first.
- **Stop when stuck.** After two failed attempts at the same problem, write the
  problem into status.md and ask, instead of trying a third approach.
- **Keep context small.** Send reading-heavy work to subagents. When the
  context gets long, update status.md and suggest `/handoff` or a new session.

## Where things come from

- Project facts and commands: `AGENTS.md` (format, test, build, deploy).
- Checks after edits and before a turn ends: the scaffold's `checks.mjs` hook.
- Guardrails (no secrets, ask before push): the scaffold's `settings.json` and
  the user-level mods. The factory does not add its own.
