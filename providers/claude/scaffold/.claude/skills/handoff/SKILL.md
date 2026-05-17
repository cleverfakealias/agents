---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "[What will the next session be used for?]"
allowed-tools: Read, Write, Bash(mktemp*)
disable-model-invocation: false
model: inherit
---

# Handoff

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save it to a path produced by `mktemp -t handoff-XXXXXX.md` (read the file before you write to it).

Suggest the skills to be used, if any, by the next session.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

If `$ARGUMENTS` is present, treat it as a description of what the next session will focus on and tailor the doc accordingly.

## Credits

Adapted from [mattpocock/skills/productivity/handoff](https://github.com/mattpocock/skills/tree/main/skills/productivity/handoff) — MIT.
