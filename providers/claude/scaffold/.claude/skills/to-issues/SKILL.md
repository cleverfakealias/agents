---
name: to-issues
description: Break a plan, spec, or PRD into independently-grabbable issues on the project's issue tracker using tracer-bullet vertical slices. Use when user wants to convert a plan into issues, create implementation tickets, or break work into issues.
argument-hint: "[optional: issue number, URL, or path to a spec/PRD]"
allowed-tools: Read, Grep, Glob, Bash(gh issue *), Bash(gh api*), Bash(gh repo view*), Bash(git*)
disable-model-invocation: false
model: inherit
---

# To Issues

Break a plan into independently-grabbable issues using vertical slices (tracer bullets).

## Issue tracker detection

Same as `/to-prd`: prefer a tracker pre-declared in `CLAUDE.md` / `AGENTS.md`; else detect from `.github/` + `gh auth status`, `.linear/`, `.scratch/`; else ask once. Default to GitHub Issues if `git remote -v` points at `github.com`.

For triage labels, use the canonical names (`ready-for-agent`, `needs-triage`, `needs-info`, `ready-for-human`, `wontfix`). If the repo uses different label strings, the user should have pre-mapped them in `CLAUDE.md`.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If `$ARGUMENTS` is an issue reference (issue number, URL, or path), fetch it from the issue tracker and read its full body and comments.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so. Issue titles and descriptions should use the project's domain glossary (`CONTEXT.md`), and respect ADRs (`docs/adr/`) in the area you're touching.

### 3. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories this addresses (if the source material has them)

Ask:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves.

### 5. Publish the issues to the issue tracker

For each approved slice, publish a new issue using the body template below. These are considered ready for AFK agents — apply `ready-for-agent` unless instructed otherwise.

Publish in dependency order (blockers first) so you can reference real issue identifiers in the "Blocked by" field.

<issue-template>
## Parent

A reference to the parent issue on the issue tracker (if the source was an existing issue, otherwise omit this section).

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it here and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- A reference to the blocking ticket (if any)

Or "None - can start immediately" if no blockers.

</issue-template>

Do NOT close or modify any parent issue.

## Credits

Adapted from [mattpocock/skills/engineering/to-issues](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-issues) — MIT.
