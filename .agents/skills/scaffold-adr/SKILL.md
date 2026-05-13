---
name: scaffold-adr
description: "Create new Architecture Decision Records, supersede existing ones, or audit the .agents/architecture/decisions/ folder for missing sections / duplicate numbers / stale proposals / dangling supersede links. Triggers: 'create ADR', 'new architecture decision record', 'supersede ADR', 'audit ADRs', 'check ADR status', 'what ADRs need revisiting', 'add a decision record'."
---

# scaffold-adr — Architecture Decision Records (Create, Supersede, Audit)

Manage the `.agents/architecture/decisions/` folder: create new ADRs with required sections and auto-numbering, supersede existing ADRs without violating immutability, and audit the whole folder for missing sections / dangling links / stale proposals / revisit triggers.

> **BEFORE EXECUTING:** Read [`SKILL-implementation.md`](SKILL-implementation.md) (sibling file) for the full step-by-step logic — required sections per mode, numbering rules, supersede mechanics (the *only* allowed mutation of an existing ADR), audit classification rules, and error handling. This page is orientation only.

---

## When to Use

| Situation | Mode |
|---|---|
| You made a non-obvious technical choice and need to record it | **New** |
| You're replacing a past decision; the prior ADR should be marked superseded | **Supersede** |
| You want to know if any ADRs are malformed, stale, or have broken links | **Audit** |
| You're doing an architecture review or onboarding handoff | **Audit** |
| You set a "Revisit when" trigger months ago and wonder if it's time | **Audit** |

---

## Layer-Presence Guard

The skill refuses to run if `.agents/architecture/decisions/` does not exist. The architecture layer (which contains ADRs) is opt-in at init — if it's not present, the user should re-run the init skill and select the layer first.

---

## Immutability Contract

**Accepted ADRs are immutable.** Once an ADR is in `Status: Accepted`, the skill will never edit it — with one explicit exception: the **Supersede mode** updates the prior ADR's `Status:` line to add `Superseded by [ADR-NNNN](./NNNN-...md)`. Nothing else about the prior ADR changes.

A `Status: Proposed` ADR is still mutable by hand-edit, but this skill does not edit them either — proposals evolve via comments, discussion, and re-drafts that overwrite the proposal in place by the human, not the agent.

---

## Mode 1: New

Guided creation of a fresh ADR with all required sections.

- Walks the user through: **Title** → **Context** → **Decision** → **Alternatives considered** → **Consequences (positive/negative/follow-up)** → **Revisit when**.
- Auto-numbers: scans `decisions/` for highest existing `NNNN-` prefix; uses `max + 1`, zero-padded to 4 digits. Never reuses a number, even if a prior ADR was deleted (numbers are append-only).
- Generates filename: `NNNN-<kebab-from-title>.md`. Trims to 60 chars max; rejects empty / non-ASCII-after-slug-strip titles.
- Pre-fills Status as `Proposed` and Date as today.
- **Refuses to overwrite** an existing file at the target path. If a collision happens (race condition with a manual edit), reports the conflict and asks the user to choose a new title.
- Optionally appends an entry to `llms.txt` under `adr-dir:` if the user opts in.

**When to pick it:** Any time you make a choice with multi-quarter consequences. The bar is low — better an over-documented decision than a re-litigated one.

---

## Mode 2: Supersede

Create a new ADR that supersedes an existing one. **The only allowed mutation of a prior ADR's content.**

- Asks which ADR to supersede via `AskUserQuestion` (lists all ADRs not already superseded or deprecated).
- Runs the same guided creation flow as Mode 1 for the new ADR, with two additions:
  - The new ADR's Context section is pre-seeded with a reference to the superseded one.
  - The new ADR's Decision section gets a `Supersedes [ADR-NNNN](./NNNN-...md)` line.
- After writing the new ADR, makes a **single-line edit** to the superseded ADR:
  - Changes `**Status**: Accepted` → `**Status**: Superseded by [ADR-NNNN](./NNNN-...md)`.
  - That's it. Nothing else in the superseded ADR changes.
- If the superseded ADR's status is not `Accepted` (e.g. it was already `Proposed` or `Deprecated`), refuses with an explanation and asks the user to clarify intent.

**When to pick it:** A past decision no longer holds — vendor change, scale threshold crossed, regulatory requirement shifted. Always supersede; never edit-in-place.

---

## Mode 3: Audit

Read-only report on the state of `.agents/architecture/decisions/`. **Never writes.**

Per-ADR checks:
- **Required sections present**: `Status`, `Date`, `Owner`, `Context`, `Decision`, `Alternatives considered`, `Consequences`, `Revisit when`. Flag missing sections.
- **Status value valid**: one of `Proposed`, `Accepted`, `Superseded by [...]`, `Deprecated`. Flag invalid.
- **Date present and parseable**.
- **Revisit when section is non-empty for Accepted ADRs**. Empty = ossification risk.

Cross-ADR checks:
- **Duplicate numbers**: two files with the same `NNNN-` prefix.
- **Numbering gaps**: a missing ADR-0003 between 0002 and 0004 (informational; not always an error if the team deletes proposals — but flag).
- **Dangling supersede links**: `Status: Superseded by [ADR-NNNN]` pointing to a file that doesn't exist.
- **Stale proposals**: `Status: Proposed` ADRs untouched (by git) for >90 days — likely abandoned, should be moved to `Deprecated` or completed.
- **Old accepted ADRs without Revisit-when**: `Status: Accepted` AND `Date` >12 months ago AND `Revisit when` is empty or missing — flag for review.

Produces a structured report; ends with `AskUserQuestion`: "Run scaffold-adr in Supersede or New mode for any flagged ADRs?"

**When to pick it:** Quarterly, during architecture reviews, or before handing off ownership of a service.

---

## What Gets Created / Updated

### New mode
- New file at `.agents/architecture/decisions/NNNN-<kebab>.md`
- (Optional) `llms.txt` entry under `adr-dir:` — only if user opts in

### Supersede mode
- New file at `.agents/architecture/decisions/NNNN-<kebab>.md` (the new ADR)
- Single-line edit to the superseded ADR's Status line

### Audit mode
- **Nothing written.** Output only: per-ADR report + cross-ADR findings.

### Never touched by this skill
- Any ADR's content besides the Status line in Supersede mode
- `.agents/architecture/` Mermaid diagrams (those are `scaffold-architecture`'s domain)
- `.agents/architecture/README.md`
- `.agents/architecture/decisions/0000-template.md` (the template itself — `tidy-scaffold` removes if unused, but this skill leaves it alone)
- Anything outside `.agents/architecture/decisions/`, except the optional `llms.txt` ADR entry append

---

## Self-Management Contract

- **Reads `project_context.md` before every run** — extracts Owner field as the default for the ADR Owner section.
- **Refuses to run if `.agents/architecture/decisions/` is absent** — directs user to re-run init.
- **Never reuses ADR numbers** — append-only, even if a prior ADR was deleted.
- **Never edits an accepted ADR** except for the single Status-line update in Supersede mode.
- **Never auto-creates ADRs in batch** — one ADR per skill invocation. Decisions deserve deliberate framing.
- **Never invents context or alternatives** — if the user gives sparse answers, asks follow-ups; never fabricates rationale.
- **Never reads secret files** — `.env`, `*.pem`, `*.key`, etc.

---

## Implementation

All execution logic — exact required-section schemas, numbering algorithm, supersede mechanics, audit classification rules, AskUserQuestion payloads, and error handling — lives in **[`SKILL-implementation.md`](SKILL-implementation.md)**. Read it before executing.
