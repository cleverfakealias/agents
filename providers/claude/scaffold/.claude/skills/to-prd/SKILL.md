---
name: to-prd
description: Turn the current conversation context into a PRD and publish it to the project's issue tracker. Use when user wants to create a PRD from the current context. Does NOT interview — synthesizes what's already been discussed.
allowed-tools: Read, Grep, Glob, Bash(gh issue create*), Bash(gh issue *), Bash(gh repo view*), Bash(gh api*), Bash(git*)
disable-model-invocation: false
model: inherit
---

# To PRD

Take the current conversation context and codebase understanding and produce a PRD. Do NOT interview the user — just synthesize what you already know.

## Issue tracker detection

Before publishing, determine where the PRD goes:

1. If `<!-- Issue tracker -->` is filled in `CLAUDE.md` or `AGENTS.md`, use that.
2. Otherwise, detect: `.github/` directory + working `gh auth status` → GitHub Issues; `.linear/` directory → Linear; `.scratch/` directory → local markdown convention.
3. If still ambiguous, ask the user once. Default to GitHub Issues if a remote on `github.com` exists.

For triage labels, prefer the canonical names used below (`ready-for-agent`, `needs-triage`, etc.). If the repo uses different label strings, the user should have pre-mapped them in `CLAUDE.md`. If no mapping is documented, use the canonical names and tell the user — they can rename labels later.

## Process

1. **Explore the repo** to understand the current state of the codebase, if you haven't already. Use the project's domain glossary (`CONTEXT.md`) throughout the PRD, and respect any ADRs (`docs/adr/`) in the area you're touching.

2. **Sketch the major modules** you will need to build or modify to complete the implementation. Actively look for opportunities to extract **deep modules** that can be tested in isolation.

   > A deep module (vs a shallow module) encapsulates a lot of functionality behind a simple, testable interface which rarely changes.

   Check with the user that these modules match their expectations. Check which modules they want tests written for.

3. **Write the PRD** using the template below, then publish it to the project issue tracker. Apply the `ready-for-agent` triage label — no need for additional triage.

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>

## Credits

Adapted from [mattpocock/skills/engineering/to-prd](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-prd) — MIT.
