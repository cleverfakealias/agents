# scaffold-adr — SKILL Implementation

**Detailed execution contract. Read this before running the skill.**

---

## Hard Exclusions (apply to every step)

Never read or pass to a subagent: `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`, `~/.aws/credentials`, `~/.config/gcloud/`, `gha-creds-*.json`, `.terraformrc`.

Never modify:
- Any ADR's content other than the **`status` and `superseded-by` YAML frontmatter fields** on a superseded ADR in Mode 2
- `.agents/architecture/decisions/0000-template.md` (the template; `tidy-scaffold` removes it if unused)
- `.agents/architecture/*.mmd` files (those are `scaffold-architecture`'s domain)
- `.agents/architecture/README.md`
- Anything outside `.agents/architecture/decisions/`, except an opt-in `llms.txt` append in Mode 1

---

## Phase 0.5 — Sub-Agent Dispatch Policy

This section defines when and how sub-agents are used. Only Mode 3 (Audit) uses sub-agents.

### Per-ADR audit sub-agent (Haiku)

Dispatched only in Mode 3. One sub-agent per ADR file, all dispatched in a single parallel batch (cap at 20 ADRs per run, oldest first by `date` frontmatter field).

**Input:** `{adr_path}` — absolute path to the ADR file.

**Behavior:**
1. Read the file and parse its YAML frontmatter block (the content between the leading `---` and closing `---`).
2. Validate required frontmatter fields are present: `adr-number`, `title`, `status`, `date`.
3. Validate `status` is one of: `Proposed`, `Accepted`, `Rejected`, `Superseded`, `Deprecated`.
4. Validate `date` is ISO-formatted (`YYYY-MM-DD`).
5. Confirm the following body sections exist (case-insensitive heading match, with or without trailing colon):
   - `## Context`
   - `## Decision`
   - `## Alternatives considered`
   - `## Consequences` (and sub-sections Positive / Negative / Follow-up)
   - `## Revisit when`
6. For ADRs where `status: Accepted` AND `date` is more than 12 months ago: check that `revisit-when` frontmatter field is non-empty.
7. For ADRs where `status: Proposed` AND `date` is more than 90 days ago: flag as stale (also cross-check via `git log --format="%cI" -1 -- <adr_path>` if available; fall back to frontmatter `date` if git history is unavailable).

**Output:** structured validation report:
```
{
  "adr_path": "<path>",
  "status": "<frontmatter status value>",
  "missing_fields": ["<field>", ...],
  "missing_sections": ["## Context", ...],
  "format_issues": ["date not ISO-formatted", ...],
  "staleness_flag": true | false
}
```

### Main agent (Sonnet) role in Audit

1. Lists ADRs (skip `0000-template.md`), caps at 20 oldest by `date`.
2. Dispatches one Haiku sub-agent per ADR in a single parallel batch.
3. Collects all sub-agent reports.
4. Performs cross-ADR checks itself (these require the full inventory and cannot be parallelized per-file):
   - Duplicate `adr-number` values.
   - Dangling `superseded-by` values pointing at nonexistent ADRs.
   - Orphan supersede claims: `supersedes: ADR-X` where ADR-X does not have `superseded-by` pointing back.
5. Emits the audit report combining sub-agent per-ADR findings with cross-ADR findings.

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
- Parse YAML frontmatter for `title`, `status`, `date`, `supersedes`, `superseded-by`.
- Store `{number, filename, title, status, date, supersedes, superseded-by}`.

YAML frontmatter parsing: extract the block between the first `---` line and the next `---` line at the top of the file. Parse each `key: value` line. Treat `null` as null; strip inline comments (content after `#`).

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
     Description: "New ADR + frontmatter field update on the prior ADR. The only allowed edit to an accepted ADR."
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

Capture the current git HEAD SHA (`git rev-parse HEAD`). If git is unavailable, use `"unknown"`.

Show the assembled ADR inline:

```
---
adr-number: <NNNN>
title: <Title>
status: Proposed
date: <today YYYY-MM-DD>
supersedes: null
superseded-by: null
revisit-when: "<revisit trigger text>"
generated-by: scaffold-adr
verified-against: <git HEAD SHA>
verified-at: <today YYYY-MM-DDT00:00:00Z>
---

# ADR-<NNNN>: <Title>

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
Wrote .agents/architecture/decisions/<NNNN>-<slug>.md  (Status: Proposed)
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
  - Share with your Deciders for review
  - Update Status to "Accepted" when consensus is reached (hand-edit the frontmatter status field)
  - Or run scaffold-adr again in Supersede mode if a future ADR replaces this one
```

---

## Phase 2: Supersede

**Atomicity contract:** Supersede is atomic in spirit. Either both the new ADR is written AND the target's frontmatter is updated, or neither happens. The precondition check (Phase 2B below) runs before any write to enforce this. If any precondition fails, abort — do not write the new ADR.

### 2A. List Supersedable ADRs

From the Phase 0C inventory, filter to ADRs where `status` frontmatter field is `Accepted` (i.e. not already `Superseded`, `Deprecated`, or `Proposed`).

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

### 2C. Dry-Run Precondition Check

Before running the Mode 1 flow or writing any file, validate the target ADR. Abort cleanly if any precondition fails.

**Preconditions (in order):**

1. **Read the target ADR's frontmatter.** Read the file; extract the YAML frontmatter block (between the first `---` and the closing `---`).

2. **Frontmatter parses as YAML.** If the block is missing or unparseable, abort:
   ```
   Precondition failed: <target-filename> has no parseable YAML frontmatter.
   Cannot supersede safely. Please inspect and correct the file manually.
   ```

3. **`status: Accepted` exists (case-sensitive value).** If the `status` field is not exactly `Accepted`, abort:
   ```
   Precondition failed: <target-filename> status is "<actual value>", not "Accepted".
   Supersede mode only applies to Accepted ADRs.
   ```

4. **`superseded-by` is `null` or absent.** If `superseded-by` is already set to a non-null value, abort:
   ```
   Precondition failed: <target-filename> already has superseded-by: <value>.
   This ADR has already been superseded. Cannot supersede it again.
   ```

5. **Compute exact replacement text and confirm it is unique.** The frontmatter update will change two fields:
   - `status: Accepted` → `status: Superseded`
   - `superseded-by: null` → `superseded-by: "ADR-<new-NNNN>"`

   Locate the exact text of both lines in the file. Confirm that the `old_string` for the Edit (the current status and superseded-by lines as they appear in the file) is unique — i.e. a search for that string matches exactly once. If it does not (ambiguous match), abort:
   ```
   Precondition failed: the status/superseded-by block in <target-filename>
   is not uniquely matchable for a safe Edit. Please inspect the file manually.
   ```

**If all five preconditions pass:** proceed to Phase 2D (run the Mode 1 flow to collect and write the new ADR), then apply the Edit.

**If any precondition fails:** stop. Do not run the Mode 1 flow. Do not write any file. Report which precondition failed with the message above.

### 2D. Run Mode 1 Flow with Modifications

Run Phase 1 (New ADR) end-to-end, with these adjustments:

- **1D. Context** — pre-seed the placeholder with: `Superseding [ADR-<target-NNNN>](./<target-filename>). <Why the previous decision no longer holds — what changed?>`
- **1E. Decision** — after writing the new decision text, append a line: `\n\nSupersedes [ADR-<target-NNNN>](./<target-filename>).`
- **1J. Render and confirm** — show the new ADR including the Supersedes line; set `supersedes: "ADR-<target-NNNN>"` in the frontmatter.
- **1K. Write** — write the new ADR file.

### 2E. Update the Superseded ADR (the only allowed mutation)

With the new ADR now written, apply the Edit to the target file. Update exactly two YAML frontmatter fields:

- Change `status: Accepted` → `status: Superseded`
- Change `superseded-by: null` → `superseded-by: "ADR-<new-NNNN>"`

Use the `Edit` tool with the exact `old_string` confirmed in the precondition check (Phase 2C, precondition 5). Nothing else in the target file changes — the body is never modified.

If the Edit fails at this point (unexpected file mutation between precondition check and edit):

```
Error: the Edit to <target-filename> failed after the new ADR was already
written. The files are now inconsistent:
  - New ADR: .agents/architecture/decisions/<new-filename>  (written)
  - Target ADR: .agents/architecture/decisions/<target-filename>  (NOT updated)

Please update the target ADR's frontmatter manually:
  status: Superseded
  superseded-by: "ADR-<new-NNNN>"
```

Do not attempt any other edits to the target file.

### 2F. Final Report (Supersede mode)

```
scaffold-adr — Done (Supersede)

Created:
  .agents/architecture/decisions/<new-NNNN>-<slug>.md  (Status: Proposed)

Updated (frontmatter fields only — body unchanged):
  .agents/architecture/decisions/<target-NNNN>-<slug>.md
  - status: Accepted          →  status: Superseded
  - superseded-by: null       →  superseded-by: "ADR-<new-NNNN>"

Next steps:
  - Share the new ADR with Deciders
  - Update its status to "Accepted" when consensus is reached (hand-edit the frontmatter)
  - The superseded ADR remains in the folder as historical record
```

---

## Phase 3: Audit

**Read-only. Never writes.**

### 3A. Dispatch Per-ADR Sub-Agents

List all ADRs (skip `0000-template.md`). Sort by `date` frontmatter field ascending. Cap at 20 oldest.

Dispatch one Haiku sub-agent per ADR in a single parallel batch (see Phase 0.5 for the per-ADR sub-agent contract). Collect all structured reports before proceeding.

### 3B. Cross-ADR Checks (main agent)

Perform these checks using the full inventory — they require the complete set and cannot be parallelized per-file:

1. **Duplicate numbers** — Group inventory by `adr-number` field. Any group with size >1 is a duplicate. Flag.

2. **Numbering gaps** — Sorted list of `adr-number` values; any `N+1 - N > 1` gap is a missing number. Flag informationally (not always an error — proposals can be deleted before becoming ADRs).

3. **Dangling `superseded-by` links** — For any ADR where `superseded-by` is non-null, verify the referenced ADR number exists in the inventory. If not, flag.

4. **Orphan supersede claims** — For any ADR where `supersedes: ADR-X`, verify that ADR-X has `superseded-by` pointing back to this ADR. If not, flag (one side of the link is broken).

5. **Stale proposals** — For any ADR where `status: Proposed` and the sub-agent reported `staleness_flag: true`, include in the cross-ADR stale list.

### 3C. Produce Audit Report

Combine per-ADR sub-agent findings with cross-ADR findings:

```
Audit Report — .agents/architecture/decisions/ — <today's date>

INVENTORY
─────────
  ADR-0001  Use Postgres over DynamoDB                    Accepted   2024-09-12
  ADR-0002  Adopt Workers for edge compute                Accepted   2024-11-03
  ADR-0003  (file: 0003-replace-postmark-with-resend.md)  Superseded 2025-02-04 -> ADR-0009
  ADR-0007  Adopt Statsig for feature flags               Proposed   2024-12-01  [stale >90 days]
  ADR-0009  Use Resend for transactional email            Accepted   2025-04-15

PER-ADR FINDINGS
────────────────
  ADR-0001 — OK
  ADR-0002 — [!] Accepted >12 months ago, "revisit-when" is empty (ossification risk)
  ADR-0003 — OK
  ADR-0007 — [!] Proposed, last touched 2024-12-01 (>90 days) — likely abandoned
  ADR-0009 — [!] Missing section: ## Consequences

CROSS-ADR FINDINGS
──────────────────
  Numbering gaps: ADR-0004, ADR-0005, ADR-0006, ADR-0008 — informational
  Duplicate numbers: none
  Dangling superseded-by links: none
  Orphan supersede claims: none
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

Already handled per-mode in Phase 1M, 2F, 3C.

---

## Error Handling

### No `.agents/architecture/decisions/` directory

Stop. Direct user to run init with architecture layer enabled. (See Phase 0A.)

### No `.agents/project_context.md`

Stop. Tell user to run init first.

### Filename collision when writing new ADR

Refuse with an explanatory message. Ask user to change the title (slug). See Phase 1C.

### Supersede precondition failure

Abort before writing any file. Report which precondition failed. See Phase 2C.

### Supersede Edit fails after new ADR was written

Report the inconsistency with exact manual remediation steps. See Phase 2E.

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

- Never edits an accepted ADR's content beyond the `status` and `superseded-by` frontmatter field updates in Supersede mode. The body is never modified.
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
