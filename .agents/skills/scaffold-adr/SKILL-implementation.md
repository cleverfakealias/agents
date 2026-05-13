# scaffold-adr — SKILL Implementation

**Detailed execution contract. Read this before running the skill.**

---

## Hard Exclusions (apply to every step)

Never read or pass to a subagent: `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`, `~/.aws/credentials`, `~/.config/gcloud/`, `gha-creds-*.json`, `.terraformrc`.

Never modify:
- Any ADR's content other than the **single Status line** on a superseded ADR in Mode 2
- `.agents/architecture/decisions/0000-template.md` (the template; `tidy-scaffold` removes it if unused)
- `.agents/architecture/*.mmd` files (those are `scaffold-architecture`'s domain)
- `.agents/architecture/README.md`
- Anything outside `.agents/architecture/decisions/`, except an opt-in `llms.txt` append in Mode 1

---

## Entry Point

When invoked, run **Phase 0** immediately. Do not ask for a mode until orientation is complete.

---

## Phase 0: Orientation

### 0A. Layer-Presence Guard

Check that `.agents/architecture/decisions/` exists. If not:

```
.agents/architecture/decisions/ is not present. The architecture layer
(which contains ADRs) is opt-in at init time.

Run the init skill (.agents/SKILL.md), select "Architecture" in the optional
context layers question, then re-run scaffold-adr.
```

Stop. Do not proceed.

### 0B. Read Project Context

Read `.agents/project_context.md`. Extract:
- `Owner` field — used as the default ADR Owner.
- `Identity` — used to seed Context references.

If `project_context.md` is absent: stop. Tell the user to run init first.

### 0C. Inventory Existing ADRs

Glob `.agents/architecture/decisions/*.md`. For each file (excluding `0000-template.md`):
- Parse `NNNN-` prefix from filename → store as `number`.
- Parse YAML-free top section for `**Status**:` and `**Date**:`.
- Store `{number, filename, title, status, date}`.

This inventory powers:
- Auto-numbering (Mode 1, 2)
- Supersede target selection (Mode 2)
- Audit (Mode 3)

### 0D. Mode Selection

Use `AskUserQuestion`:

```
Question: "What would you like to do?"
Header: "scaffold-adr — Mode"
Options:
  1. "New — create a new ADR"
     Description: "Guided creation of a fresh ADR. Auto-numbered, all required sections."
  2. "Supersede — create an ADR that replaces an existing one"
     Description: "New ADR + single-line Status update on the prior ADR. The only allowed edit to an accepted ADR."
  3. "Audit — read-only report on the state of all ADRs"
     Description: "Check for missing sections, dangling supersede links, stale proposals, old accepted ADRs without revisit triggers."
```

Route to **Phase 1** (New), **Phase 2** (Supersede), or **Phase 3** (Audit).

---

## Phase 1: New ADR

### 1A. Collect Title

```
Question: "Title in imperative form (the decision in one line)"
Header: "ADR — Title"
Input: text
Placeholder: "Use Postgres over DynamoDB for primary OLTP"
```

Reject if:
- Empty after trimming
- Contains characters that won't slug to ASCII kebab-case after lowering and replacing non-alphanumerics with `-`
- Slugified form exceeds 60 chars (ask the user to shorten)

Slugify: lower-case → replace `[^a-z0-9]+` with `-` → trim leading/trailing `-`.

### 1B. Compute Number

From the inventory in Phase 0C, find `max(number)` across all existing ADRs (excluding `0000-template.md` which is always 0000).

`new_number = max(numbers) + 1`, padded to 4 digits.

If no ADRs exist yet (only `0000-template.md` present): `new_number = "0001"`.

Numbers are append-only. Even if `0003` was deleted previously, do not reuse — the next ADR is `max(remaining) + 1`.

### 1C. Compute Filename

`<new_number>-<slug>.md`

Check `.agents/architecture/decisions/<filename>` does not exist. If it does (race with manual edit): refuse with:

```
A file at <filename> already exists. This is unexpected — ADR numbers should
be unique. Either:
  1. Choose a different title (slug)
  2. Inspect what's already at that path and resolve manually
```

Re-ask the title question if the user picks option 1.

### 1D. Collect Context

```
Question: "Context — what forced the decision?"
Header: "ADR — Context"
Input: large text
Placeholder: "We're hitting Postgres write contention at ~3k QPS. Mobile launch in Q3 expects 4x current load. Team has Postgres expertise but no DynamoDB experience."
```

Required. If empty, re-ask with a note that ADRs without context become folklore.

### 1E. Collect Decision

```
Question: "Decision — what's the choice, and why?"
Header: "ADR — Decision"
Input: large text
Placeholder: "Stay on Postgres; add read replicas in eu-west-1 and shard the events table by tenant_id. We accept the operational cost of sharding in exchange for keeping team expertise leveraged."
```

Required.

### 1F. Collect Alternatives

```
Question: "Alternatives considered (one per line)"
Header: "ADR — Alternatives"
Input: large text
Placeholder: |
  DynamoDB — lost: team has no operational experience; cost projections favor Postgres at our scale
  Status quo (vertical scaling) — lost: m7g.4xlarge already; next size up is 2x cost for 1.4x headroom
  CockroachDB — lost: licensing cost, no Cloudflare integration story
```

Required. Parse each non-empty line into a bullet.

### 1G. Collect Consequences

Three sub-questions (separate AskUserQuestion calls — one question each, since they're distinct angles):

```
Question 1: "Positive consequences — what does this unlock?"
Header: "ADR — Consequences (Positive)"
Input: large text
Placeholder: "Stay on familiar ops surface. Reuse existing migrations tooling. Read replicas reduce primary load by ~40%."
```

```
Question 2: "Negative consequences — what does this foreclose or make harder?"
Header: "ADR — Consequences (Negative)"
Input: large text
Placeholder: "Sharding adds query-routing complexity. Single-region writes remain a SPOF. Cross-shard joins become application logic."
```

```
Question 3: "Follow-up — what must be true within N weeks for this to land cleanly?"
Header: "ADR — Consequences (Follow-up)"
Input: large text
Placeholder: |
  Migration plan for events table by 2026-07
  Sharding library decision (Citus vs custom) by 2026-06
  Runbook update for replica failover
```

All three are required. Empty Negative is especially suspicious — re-prompt with a note ("Every decision has a cost; if you can't name one, the decision likely isn't load-bearing enough to need an ADR").

### 1H. Collect Revisit Trigger

```
Question: "Revisit when — what concrete trigger should force re-evaluation?"
Header: "ADR — Revisit When"
Input: text
Placeholder: "Sustained write throughput exceeds 8k QPS, or single-region SPOF causes a customer-visible incident, or team grows past 30 engineers."
```

Required. Without a trigger, the ADR ossifies and becomes folklore. If the user insists they don't have one, accept but warn in the final report.

### 1I. Confirm Owner

Default Owner from `project_context.md` Owner field. Confirm:

```
Question: "Owner for this ADR"
Header: "ADR — Owner"
Input: text
Default: "<owner from project_context.md>"
```

### 1J. Render and Confirm

Show the assembled ADR inline:

```
ADR-<NNNN>: <Title>

**Status**: Proposed
**Date**: <today YYYY-MM-DD>
**Owner**: <owner>
**Deciders**: <leave blank for user to fill in if they want — optional>

## Context
<context>

## Decision
<decision>

## Alternatives considered
- <alt 1>
- <alt 2>
...

## Consequences

**Positive**
<positive>

**Negative**
<negative>

**Follow-up**
<follow-up>

## Revisit when
<revisit>
```

Ask:

```
Question: "Write this ADR?"
Header: "ADR — Confirm"
Options:
  1. "Write as shown"
  2. "Let me edit a section"
  3. "Cancel — don't write"
```

If "Let me edit a section": ask which section, accept revised text, re-render, ask again.

### 1K. Write

Write to `.agents/architecture/decisions/<filename>`. Confirm:

```
✓ Wrote .agents/architecture/decisions/<NNNN>-<slug>.md  (Status: Proposed)
```

### 1L. Optional llms.txt Append

```
Question: "Add this ADR to llms.txt under adr-dir:?"
Header: "llms.txt Entry"
Options:
  1. "Yes — append a pointer line"
  2. "No — llms.txt already covers the adr-dir"
```

If yes: append `adr-<NNNN>: .agents/architecture/decisions/<filename>` after the existing `adr-dir:` line in `llms.txt`.

If no: skip.

### 1M. Final Report (New mode)

```
scaffold-adr — Done (New)

Created:
  .agents/architecture/decisions/<NNNN>-<slug>.md

Status: Proposed
Owner: <owner>

Next steps:
  • Share with your Deciders for review
  • Update Status to "Accepted" when consensus is reached (hand-edit; one-line change)
  • Or run scaffold-adr again in Supersede mode if a future ADR replaces this one
```

---

## Phase 2: Supersede

### 2A. List Supersedable ADRs

From the Phase 0C inventory, filter to ADRs where `Status` starts with `Accepted` (i.e. not already `Superseded by...` or `Deprecated`, and not `Proposed`).

If the list is empty:

```
No Accepted ADRs found. Supersede mode only applies to ADRs already in
Accepted status. If you want to replace a Proposed ADR, just hand-edit the
proposal in place — proposals are mutable until they're accepted.

If you want to create a fresh ADR, run scaffold-adr again and choose
"New".
```

Exit cleanly.

### 2B. Choose Target

```
Question: "Which ADR should the new one supersede?"
Header: "Supersede — Target"
Options:
  1. "ADR-0003: Use Postgres over DynamoDB  (Accepted, 2024-09-12)"
  2. "ADR-0007: Adopt feature-flag service Statsig  (Accepted, 2025-02-04)"
  ...
```

(Up to 10 options. If more than 10, show the 10 most recently dated; offer "Other — give me a number" as an additional option.)

### 2C. Run Mode 1 Flow with Modifications

Run Phase 1 (New ADR) end-to-end, with these adjustments:

- **1D. Context** — pre-seed the placeholder with: `Superseding [ADR-<target-NNNN>](./<target-filename>). <Why the previous decision no longer holds — what changed?>`
- **1E. Decision** — after writing the new decision text, append a line: `\n\nSupersedes [ADR-<target-NNNN>](./<target-filename>).`
- **1J. Render and confirm** — show the new ADR including the Supersedes line.
- **1K. Write** — write the new ADR file.

### 2D. Update the Superseded ADR (the only allowed mutation)

Read `.agents/architecture/decisions/<target-filename>`. Find the Status line. It should match:

```
- **Status**: Accepted
```

Replace with:

```
- **Status**: Superseded by [ADR-<new-NNNN>](./<new-filename>)
```

Use the `Edit` tool with the exact line as `old_string`. If the line doesn't match the expected form (e.g. it says `**Status**: Accepted | Superseded by [...]` as in the template), abort the supersede with a clear error and ask the user to inspect the file manually:

```
Couldn't find a clean `**Status**: Accepted` line in <target-filename> to
update. The file's Status line may have been hand-formatted differently
than the template.

The new ADR <new-filename> was written, but the old one's Status line
was NOT updated. Please update it manually:

  Change: **Status**: <current value>
  To:     **Status**: Superseded by [ADR-<new-NNNN>](./<new-filename>)
```

Do not attempt any other edits to the target file.

### 2E. Final Report (Supersede mode)

```
scaffold-adr — Done (Supersede)

Created:
  .agents/architecture/decisions/<new-NNNN>-<slug>.md  (Status: Proposed)

Updated (single Status-line edit only):
  .agents/architecture/decisions/<target-NNNN>-<slug>.md
  - **Status**: Accepted
  + **Status**: Superseded by [ADR-<new-NNNN>](./<new-filename>)

Next steps:
  • Share the new ADR with Deciders
  • Update its Status to "Accepted" when consensus is reached
  • The superseded ADR remains in the folder as historical record
```

---

## Phase 3: Audit

### 3A. Per-ADR Checks

For each ADR in the inventory (skip `0000-template.md`):

1. **Required sections present** — Look for the following markdown headings (case-insensitive, allow with or without colon):
   - `## Context`
   - `## Decision`
   - `## Alternatives considered`
   - `## Consequences`
   - `## Revisit when`

   Also check the top-of-file metadata:
   - `**Status**:` line present and parseable
   - `**Date**:` line present and parseable as YYYY-MM-DD
   - `**Owner**:` line present

   Flag missing sections per ADR.

2. **Status value valid** — Must match one of:
   - `Proposed`
   - `Accepted`
   - `Superseded by [ADR-NNNN](./<filename>)`
   - `Deprecated`

   Flag invalid values.

3. **Revisit when populated for Accepted ADRs** — If Status is `Accepted` and the `## Revisit when` section is empty or contains only template placeholder text, flag as ossification risk.

### 3B. Cross-ADR Checks

1. **Duplicate numbers** — Group inventory by `number` field. Any group with size >1 is a duplicate. Flag.

2. **Numbering gaps** — Sorted list of numbers; any `N+1 - N > 1` gap is a missing number. Flag informationally (not always an error — proposals can be deleted before becoming ADRs).

3. **Dangling supersede links** — For any ADR with `Status: Superseded by [ADR-NNNN](./X.md)`, check that `X.md` exists in the folder. If not, flag.

4. **Stale proposals** — For any ADR with `Status: Proposed`:
   - Run `git log --format="%cI" -1 -- <filepath>` to get the most recent commit ISO date for that file.
   - If `today - last_commit > 90 days`, flag as stale.
   - If git history unavailable, fall back to comparing the ADR's `**Date**:` field; same threshold.

5. **Old accepted ADRs without revisit triggers** — For any ADR with `Status: Accepted` AND `Date` >12 months ago AND `Revisit when` section empty or placeholder-only, flag.

### 3C. Produce Audit Report

```
Audit Report — .agents/architecture/decisions/ — <today's date>

INVENTORY
─────────
  ADR-0001  Use Postgres over DynamoDB                    Accepted   2024-09-12
  ADR-0002  Adopt Workers for edge compute                Accepted   2024-11-03
  ADR-0003  (file: 0003-replace-postmark-with-resend.md)  Superseded 2025-02-04 → ADR-0009
  ADR-0007  Adopt Statsig for feature flags               Proposed   2024-12-01  ⚠ stale (>90 days untouched)
  ADR-0009  Use Resend for transactional email            Accepted   2025-04-15

PER-ADR FINDINGS
────────────────
  ADR-0001 — OK
  ADR-0002 — ⚠ Accepted >12 months ago, "Revisit when" is empty (ossification risk)
  ADR-0003 — OK
  ADR-0007 — ⚠ Proposed, last touched 2024-12-01 (>90 days) — likely abandoned
  ADR-0009 — ⚠ Missing section: ## Consequences

CROSS-ADR FINDINGS
──────────────────
  Numbering gaps: ADR-0004, ADR-0005, ADR-0006, ADR-0008 — informational
  Duplicate numbers: none
  Dangling supersede links: none

  ✗ ADR-0003 says "Superseded by [ADR-0009](./0009-use-resend.md)" but
    file 0009-use-resend.md doesn't exist (actual file: 0009-use-resend-for-transactional-email.md)
```

### 3D. Audit "What Next" Prompt

```
Question: "What would you like to do next?"
Header: "Audit — Next Action"
Options:
  1. "Create a new ADR (e.g. to formalize a missing decision)"
     Description: "Run scaffold-adr in New mode."
  2. "Supersede a stale or out-of-date ADR"
     Description: "Run scaffold-adr in Supersede mode targeting one of the flagged ADRs."
  3. "Nothing for now — I'll fix the issues by hand"
     Description: "Exit. The report above is the deliverable."
```

Route to Phase 1, Phase 2, or exit.

---

## Phase 4: Final Report

Already handled per-mode in Phase 1M, 2E, 3C.

---

## Error Handling

### No `.agents/architecture/decisions/` directory

Stop. Direct user to run init with architecture layer enabled. (See Phase 0A.)

### No `.agents/project_context.md`

Stop. Tell user to run init first.

### Filename collision when writing new ADR

Refuse with an explanatory message. Ask user to change the title (slug). See Phase 1C.

### Supersede target has unexpected Status line format

The single-line edit fails because `old_string` doesn't match. Abort the Status update, leave the new ADR in place, tell the user the exact lines to change manually. See Phase 2D.

### Audit finds no ADRs

```
No ADRs found in .agents/architecture/decisions/. Run scaffold-adr in
New mode to create your first one.
```

Exit cleanly.

### Numbering corruption

If two files share the same `NNNN-` prefix, audit will flag it. New / Supersede modes will still compute `max + 1` correctly (max ignores duplicates), but the underlying state is broken — the report should be acted on before adding more ADRs.

### User aborts mid-creation

If the user cancels any required AskUserQuestion in Phase 1 or 2, do not write any file. Exit cleanly with a note that the draft is discarded. Never leave a half-written ADR.

---

## Scope Boundaries — What scaffold-adr Never Does

- Never edits an accepted ADR's content beyond the single Status-line update in Supersede mode.
- Never edits a superseded or deprecated ADR.
- Never deletes any ADR. (`tidy-scaffold` may delete the `0000-template.md` template only.)
- Never reuses an ADR number.
- Never creates more than one ADR per skill invocation.
- Never invents Context, Decision, Alternatives, or Consequences content. If the user gives sparse input, asks follow-ups.
- Never modifies `.agents/architecture/*.mmd` (those belong to `scaffold-architecture`).
- Never modifies `.agents/architecture/README.md`.
- Never reads secret files.
- Never runs `git commit`, `git push`, or deploy commands.
- Never auto-writes in Audit mode.
