---
name: zenn
description: Spec-first workflow for significant work. Use when the user asks for a spec or plan, or starts a feature, refactor, or integration that spans several files or sessions. Captures intent, gets a plan approved, then implements against a task list. Not for questions, exploration, or small fixes.
---

# Zenn mode

Capture intent before code, turn it into a plan, get the plan approved, then build
against a task list. Nothing significant gets built from a vague prompt, and any
session can be picked up cold.

## Pick the size

Say which one you're using, then proceed.

- **Small** (one area, one session): a single `specs/<slug>.md` with Intent,
  Approach, Tasks, and Notes.
- **Large** (cross-cutting or multi-session): a `specs/<slug>/` folder with
  - `requirements.md`: problem, goals, non-goals, acceptance criteria
  - `plan.md`: design, interfaces, data shapes, test strategy
  - `tasks.md`: ordered checklist
  - `status.md`: current state, decisions and why, open questions, where to resume

## The loop

1. **Elicit.** Ask the questions that actually reduce ambiguity: scope, inputs and
   outputs, edge cases, constraints, non-goals. Group them, and skip what the
   request already answers.
2. **Write the intent**: what and why, with acceptance criteria that can be checked.
3. **Write the plan**: how, in enough detail that design decisions are made here
   and not discovered mid-code. Say how each acceptance criterion will be tested.
4. **List the tasks** in order.
5. **Get approval.** Show the intent and the plan. Don't write implementation code
   until the user approves.
6. **Build**, checking off tasks and verifying against the acceptance criteria.
7. **Keep the spec honest.** If the work has to deviate from the plan, update the
   spec, and tell the user when the deviation is significant.

## Resuming

Read `status.md` (or Notes) first, then the plan, then continue from the next
unchecked task. Don't re-derive what is already decided.

## Judgment

- Keep specs short enough that they get read.
- Ask before assuming when something is ambiguous; act once intent is clear and
  approved.
- If the user wants a quick fix, skip all of this.
