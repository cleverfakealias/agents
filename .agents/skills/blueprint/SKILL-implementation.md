# Blueprint — SKILL Implementation

**Detailed execution contract. Read this before running the skill.**

---

## Hard Exclusions (apply to every step)

Never read or pass to a subagent: `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`, `~/.aws/credentials`, `~/.config/gcloud/`, `gha-creds-*.json`, `.terraformrc`. If found during any scan, skip silently. Variable **names** may be inferred from non-secret sources (`process.env.X` in code, `wrangler.toml` `[vars]` keys) — values never.

---

## Phase 0.5 — Sub-Agent Dispatch Policy

Two sub-agents are dispatched at specific points in the workflow. Both run as Haiku to minimize cost.

### Conflict-Detection Sub-Agent (Mode 1, Phase 1A)

Dispatched in Mode 1 Phase 1A, replacing the "build a mental list" instruction.

- **Model:** Haiku
- **Input:** `{new_intent_draft, existing_intents_list, project_context_md}`
  - `existing_intents_list`: the filename, title, and `## Scope` text of every file in `.agents/intents/open/` and `.agents/intents/in-flight/`.
  - `new_intent_draft`: the proposed title, scope, and file list from Phase 1E.
- **Behavior:** For each existing intent, check overlap with the draft on: file paths in scope, named systems or components, named ADRs referenced.
- **Output:** A structured overlap table — one row per overlapping existing intent:

  ```
  existing_intent_id | existing_intent_title | shared_files | shared_concepts | severity
  ```

  `severity` values: `none` | `low` | `medium` | `high`. Omit rows where severity is `none`.

The main agent (Sonnet) reads the table. If any row has severity `medium` or `high`, surface the conflict to the user via `AskUserQuestion` before creating intent files (see 1E conflict check).

### Per-Intent Staleness Sub-Agent (Mode 2, Phase 2D)

Dispatched once per in-flight intent in Mode 2 Phase 2D, replacing manual date arithmetic.

- **Model:** Haiku
- **Input:** `{intent_path, current_sha}`
  - `intent_path`: absolute path to the intent file.
  - `current_sha`: output of `git rev-parse HEAD`.
- **Behavior:**
  1. Read the intent's YAML frontmatter to extract `verified-against` and `updated`.
  2. Run `git log <verified-against>..HEAD -- <files implied by ## Scope>` to detect activity on scope files since last verification.
  3. Compare `updated` date against the staleness window: 14 days for in-flight, 30 days for open.
- **Output:**

  ```
  {
    "intent_path": "...",
    "last_activity_sha": "...",
    "last_activity_date": "YYYY-MM-DD",
    "staleness_flag": true | false,
    "scope_files_drifted_count": N
  }
  ```

The main agent collects all results and presents flagged intents to the user via `AskUserQuestion` with options: defer / cancel / update-status / split-intent.

---

## Entry Point

When the skill is invoked, immediately run **Phase 0** (orientation). Do not ask what mode the user wants until after you have read the current repo state — the orientation output informs the choice.

---

## Phase 0: Orientation (always runs first)

### 0A. Read Core Context

Read these files (in order). Do not skip even if you think you know the contents:

1. `.agents/project_context.md` — stack, commands, structure, boundaries, env vars
2. `.agents/global_core.md` — universal rules (for scope-lock awareness)
3. `.agents/intents/open/` — list files; extract `id`, title line, and `## Scope` from each
4. `.agents/intents/in-flight/` — same
5. `.agents/intents/done/` — list only (count is enough; don't read content)

If any file/dir is absent: note the gap, do not error. Absent dirs mean the layer isn't scaffolded yet — surface this in Phase 0 output.

### 0B. Check for Stale In-Flight Intents

For each file in `.agents/intents/in-flight/`: check the `created:` date in the YAML frontmatter. If `(today - created) > 14 days`, mark it as stale for surfacing in Phase 0 output.

### 0C. Present State Summary

Show the user a concise state snapshot before asking anything:

```
📍 Project: <name from project_context.md>
   Stack: <language + framework + runtime — one line>

📋 Intent status:
   Open (not started): N
   In-flight: N  [⚠️ X stale >14d: <slugs>]
   Done: N

[if intents layer not scaffolded]
⚠️  .agents/intents/ not found. The init skill can scaffold it — run that first,
    or continue and I'll create the directory structure as part of this session.

[if project_context.md not found]
⚠️  .agents/project_context.md not found. Run the init skill first to scaffold
    project context, then return here.
```

### 0D. Ask Mode

Use `AskUserQuestion`:

```
Question: "What would you like to do?"
Header: "Blueprint — Mode"
Options:
  1. "Plan a new feature or system"
     Description: "Guide me through what you want to build → decompose into intents → create files."
  2. "Sync the repo (catch up after shipped intents)"
     Description: "Mark in-flight intents as done, refresh AGENTS.md and llms.txt."
  3. "Just show me what's open / in-flight"
     Description: "Read-only status report. No files created or moved."
```

Route to **Mode 1: Plan**, **Mode 2: Sync**, or **Mode 3: Status** below.

---

## Mode 1: Plan

### 1A. Conflict Check

Before asking anything: collect all open and in-flight intent files (titles + `## Scope` sections). At Phase 1E (after the decomposition draft is ready), dispatch the **Conflict-Detection Sub-Agent** (see Phase 0.5) with the draft and the existing intents list. The sub-agent returns an overlap table; use it to surface conflicts via `AskUserQuestion` if severity is `medium` or `high`. Do not attempt to hold a mental list — delegate to the sub-agent.

### 1B. Discovery — What Are We Building?

Use `AskUserQuestion` (sequential — ask all at once if the tool supports multi-question, otherwise one at a time):

```
Q1: "What do you want to build?"
Header: "Discovery"
Input: large text
Placeholder: "A webhook ingestion pipeline that normalizes events from Stripe and GitHub into a unified format"

Q2: "What problem does it solve, and who does it serve?"
Header: "Discovery"
Input: text
Placeholder: "Internal analytics team needs a single event stream; currently hand-patching two different schemas"

Q3: "Any hard constraints?"
Header: "Discovery"
Input: text
Placeholder: "Must be live within 3 weeks, must reuse existing Postgres, can't introduce new cloud vendors"
Optional: true
```

Store responses. **Do not propose a solution yet.** Proceed to stack check.

### 1C. Stack Assessment

Read `.agents/project_context.md` again (you already have it from Phase 0 — use that).

Ask:

```
Q: "Does this feature fit within your existing stack, or does it introduce something new?"
Header: "Stack"
Options:
  1. "Fits the existing stack — no new tech"
  2. "Introduces one or more new technologies / services"
  3. "I'm not sure — help me figure it out"
```

**If option 1:** Skip to 1E (decomposition). Note: no ADR needed.

**If option 2:** Ask follow-up:
```
Q: "What new technology or service are you considering, and why?"
Header: "Stack — New Tech"
Input: text
Placeholder: "Redis for a job queue — we need async processing and don't want to block the request path"
```
Proceed to 1D (tech evaluation).

**If option 3:** Run a brief tech assessment — see 1D.

### 1D. Tech Evaluation (only if new tech or "not sure")

Based on what you know from `project_context.md` (runtime, existing deps, infra) and the user's description:

1. **Propose 2–3 options** that fit the constraints. Be specific: include version, rationale, and one trade-off each.
2. **Ask which direction they want to go**, or if they want to stay with what they have.
3. **Flag ADR**: If the choice has multi-quarter consequences (new datastore, new async primitive, new vendor), say:

```
This looks like a significant architectural choice. I'll create an ADR in
.agents/architecture/decisions/ to record the decision and rationale. You can
review and adjust it before committing.
```

Store the final stack decision. It will be used in intent scope sections and optionally in a new ADR.

### 1E. Decompose into Work Units

Based on everything gathered:

1. **Propose a decomposition** — a numbered list of work units. Each should be:
   - One PR-sized chunk of work (can be reviewed end-to-end in one sitting)
   - Named in imperative present tense: "Add Stripe webhook receiver", "Normalize Stripe event schema"
   - Have a clear boundary (what it does and what it explicitly doesn't do)

2. **Present for review:**

```
Here's how I'd break this down into intents:

1. <Title> — <one-line description>
2. <Title> — <one-line description>
3. ...

Dependencies: [1 → 2 → 3] or [1 and 2 are independent, 3 blocks on both]

Does this decomposition look right? Add, remove, or reorder before I create the files.
```

3. **Incorporate feedback.** Re-present if the user wants significant changes.

4. **Conflict check**: Before finalizing, compare proposed scope against open/in-flight intents (from 1A). If any overlap:

```
⚠️  This overlaps with an existing open intent: <slug>
    That intent's scope includes: <relevant scope line>
    Options:
      1. Amend the existing intent to absorb this work (recommend)
      2. Create a new intent and note the dependency
      3. Replace the existing intent
```

### 1F. Generate Intent Files

For each confirmed work unit, create `.agents/intents/open/YYYY-MM-DD-<slug>.md` using this template:

```markdown
---
intent-id: YYYY-MM-DD-<slug>
title: <human-readable title matching the H1 below>
owner: <from project_context.md Owner field>
status: open    # open | in-flight | done | cancelled
created: YYYY-MM-DD
updated: YYYY-MM-DD
verified-against: <git HEAD SHA at creation>
verified-at: <ISO timestamp at creation>
generated-by: blueprint
---

# <Title — imperative, what the system will do after this lands>

## Goal

<One sentence. The user-visible or system-visible outcome.>

## Success criteria

- [ ] <Observable, testable condition 1>
- [ ] <Observable, testable condition 2>
- [ ] <Observable, testable condition 3>

## Scope

What is being changed. Concrete — name files or modules if known.

- <file or module 1>
- <file or module 2>

## Out of scope

What is **deliberately not** being changed. This section is binding for any agent picking up the work.

- <explicit exclusion 1>
- <explicit exclusion 2>

## Plan

1. <Step 1 — one commit or PR-ready unit of work>
2. <Step 2>
3. <Step 3>

## Risks / open questions

- <Risk or open question 1>
- <Risk or open question 2>

## Linked

- ADRs: <if applicable, e.g. ADR-0001 — otherwise remove>
- Issues / tickets: 
- PRs (filled in as they land): 
```

Fill every section using what was gathered in 1B–1E. Do not leave `<!-- TODO -->` markers — ask the user if anything is genuinely unknown rather than leaving a placeholder.

**Frontmatter stamping rules:**
- `intent-id`: `YYYY-MM-DD-<slug>` matching the filename.
- `title`: the imperative H1 title of the intent.
- `owner`: from `project_context.md` Owner field.
- `status`: `open` on creation.
- `created` and `updated`: today's date (ISO 8601).
- `verified-against`: output of `git rev-parse HEAD` at creation time. If git is unavailable, write `unknown`.
- `verified-at`: ISO 8601 timestamp at creation.
- `generated-by`: `blueprint` (literal).

**Transition rules (Mode 2 — Sync):** When moving an intent between folders (`open/ → in-flight/` or `in-flight/ → done/`), update these frontmatter fields in the file before moving it:
- `status`: set to the new state (`in-flight` or `done`).
- `updated`: today's date.
- `verified-against`: current `git rev-parse HEAD`.
- `verified-at`: current ISO 8601 timestamp.

**After creating files:** list what was created:

```
✅ Created N intent files in .agents/intents/open/:
  • .agents/intents/open/YYYY-MM-DD-add-stripe-webhook-receiver.md
  • .agents/intents/open/YYYY-MM-DD-normalize-stripe-event-schema.md
  ...
```

### 1G. Create ADR (if flagged in 1D)

Read `.agents/architecture/decisions/` to find the next ADR number (highest existing `NNNN` + 1). If the directory doesn't exist, create it and start at `0001`.

Create `.agents/architecture/decisions/NNNN-<slug>.md` using the ADR template from `.agents/architecture/decisions/0000-template.md`. Fill in:

- **Context** — the problem forcing the decision (from 1B discovery + constraint)
- **Decision** — the chosen option with rationale (from 1D)
- **Alternatives considered** — the other options that were evaluated
- **Consequences** — positives, negatives, follow-ups
- **Revisit when** — a concrete trigger (not "when things change")

Status: `Proposed` (user accepts → they change to `Accepted` manually, or you can ask them).

### 1H. Update Repo Files (if stack or structure changed)

**Only run this step if the planned feature changes the stack, introduces new env vars, or adds a significant new directory.**

Ask:

```
Q: "Should I update project_context.md and regenerate AGENTS.md to reflect this feature's additions?"
Header: "Repo Update"
Options:
  1. "Yes — update now"
  2. "No — I'll do it when the feature ships"
```

**If yes:**

1. Edit `.agents/project_context.md`:
   - Add new dep to `## Stack` (name + version)
   - Add new env var names to `## Environment Variables` table
   - Add new directories to `## Project Structure` if they'll be net-new
   - Do NOT edit sections that didn't change

2. Regenerate `AGENTS.md` by delegating to init's assembly procedure:

   After any update to `.agents/project_context.md`, blueprint MUST NOT reassemble `AGENTS.md` itself. Instead:

   1. Locate `.agents/SKILL-implementation.md` → section "Procedure: Assemble AGENTS.md".
   2. Follow that procedure verbatim. Do NOT reimplement the concatenation, separator format, or frontmatter stamping logic here.
   3. If the procedure section is missing from `.agents/SKILL-implementation.md`, abort and report: "init's assembly procedure is missing; cannot regenerate AGENTS.md safely."

   This keeps `AGENTS.md` assembly single-source. If init's format changes (separator, frontmatter, conditional JS/TS block), blueprint inherits the change automatically.

3. Regenerate `llms.txt` only if the new feature adds directories that belong in the index (new routes, new API dir, etc.). Otherwise skip — `llms.txt` is structure, not intent.

### 1I. Session Summary

```
✅ Blueprint complete!

📝 Intents created (N):
  [list each file]

[if ADR created]
📐 ADR created:
  .agents/architecture/decisions/NNNN-<slug>.md

[if project_context.md updated]
🔄 Repo files updated:
  .agents/project_context.md
  AGENTS.md
  [llms.txt if updated]

🚀 Recommended order to work these intents:
  1. <slug> (no dependencies)
  2. <slug> (depends on 1)
  ...

💡 Next steps:
  • Move an intent to .agents/intents/in-flight/ when you start it
  • Link the intent in your first commit message and PR description
  • Run the blueprint skill in Sync mode when intents ship
  • Run the init skill if you need to scaffold architecture or intents dirs
```

---

## Mode 2: Sync

### 2A. Build Full Status Picture

Read and list:
- `.agents/intents/open/` — all filenames + titles
- `.agents/intents/in-flight/` — all filenames + titles + `created:` dates
- `.agents/intents/done/` — count only

### 2B. Ask About In-Flight Intents

For each in-flight intent, ask the user if it has shipped:

```
Q: "Which of these in-flight intents have shipped?"
Header: "Sync — Mark Done"
multiSelect: true
Options: [one per in-flight intent — show slug + title]
+ "None yet"
```

**For each selected:** Move `.agents/intents/in-flight/YYYY-MM-DD-<slug>.md` → `.agents/intents/done/YYYY-MM-DD-<slug>.md`. (Shell: `mv` or write + delete if shell unavailable.)

### 2C. Ask About Open Intents

```
Q: "Any open intents that should be marked in-flight (you've started work)?"
Header: "Sync — Mark In-Flight"
multiSelect: true
Options: [one per open intent — show slug + title]
+ "None"
```

**For each selected:** Move `.agents/intents/open/` → `.agents/intents/in-flight/`.

### 2D. Check for Stale In-Flight

For each in-flight intent, dispatch the **Per-Intent Staleness Sub-Agent** (see Phase 0.5) with `{intent_path, current_sha}`. Collect all results, then present flagged intents (where `staleness_flag: true`) to the user:

```
These intents are stale (>14 days in-flight with no recent scope-file activity):
  • <slug> (last activity: YYYY-MM-DD, scope files drifted: N)

Options for each:
  1. Leave as in-flight
  2. Move to abandoned/ (explain why in the file before moving)
  3. Split into smaller intents
  4. Update status and re-verify (refreshes frontmatter fields)
```

Process per intent. If "move to abandoned": read the intent file, ask for a one-line abandonment reason, append it to the file under a `## Abandoned` heading, then move the file. If "update status and re-verify": refresh `updated`, `verified-against`, and `verified-at` in the frontmatter before continuing.

### 2E. Refresh AGENTS.md if Stale

Read `AGENTS.md`. Compare its `project_context.md` section against the current `.agents/project_context.md`. If they differ (even whitespace), regenerate by delegating to init's assembly procedure:

1. Locate `.agents/SKILL-implementation.md` → section "Procedure: Assemble AGENTS.md".
2. Follow that procedure verbatim.
3. If the procedure section is missing, abort and report: "init's assembly procedure is missing; cannot regenerate AGENTS.md safely."

Tell the user when AGENTS.md was regenerated. Blueprint does not reimplement the concatenation, separator format, or frontmatter stamping logic inline.

### 2F. Sync Summary

```
✅ Sync complete!

📋 Changes:
  • Moved to done: <slugs or "none">
  • Moved to in-flight: <slugs or "none">
  • Moved to abandoned: <slugs or "none">
  • AGENTS.md: <regenerated | up to date>

📊 Current status:
  Open: N | In-flight: N | Done: N

[if stale intents remain]
⚠️  Still watching: <slugs> (in-flight, no PR linked)

💡 Next steps:
  • Run blueprint in Plan mode to plan the next feature
  • Link intent files in PR descriptions as you work
```

---

## Mode 3: Status (read-only)

Read `.agents/intents/{open,in-flight,done,abandoned}/`. Show a formatted table:

```
📊 Intent Status — <project name>

IN-FLIGHT (N)
  • <YYYY-MM-DD-slug> — <title>  [⚠️ stale] 

OPEN (N)
  • <YYYY-MM-DD-slug> — <title>

DONE (N total)

ABANDONED (N total)
```

No files are created or moved. Tell the user to run Plan or Sync to take action.

---

## Error Handling

### `.agents/project_context.md` not found

```
.agents/project_context.md is missing. The blueprint skill needs project context
to ground its proposals.

Run the init skill first (.agents/SKILL.md) to scaffold project_context.md,
then return here.
```

Stop. Do not proceed.

### `.agents/intents/` not found

```
.agents/intents/ is not scaffolded. I'll create the directory structure now.
```

Create:
```
.agents/intents/
  README.md         ← copy from .agents/intents/README.md template if it exists
  intent.template.md
  open/.gitkeep
  in-flight/.gitkeep
  done/.gitkeep
  abandoned/.gitkeep
```

Continue with the session.

### `.agents/architecture/decisions/` not found (when ADR is needed)

Create the directory and start numbering at `0001`. Note to the user that the architecture layer wasn't previously scaffolded — offer to run the init skill to get the full layer (diagrams, etc.) after this session.

### Decomposition produces a single intent

That's valid. One intent is fine for small features. Don't pad artificially.

### User rejects all decomposition options

Ask: "Walk me through how you'd break this up." Take dictation. Build the intents from their description.

### Conflict between proposed scope and existing open intent

Surface explicitly (see 1E). Never silently create an intent whose scope overlaps an existing one.

---

## Template Reference — Assembled AGENTS.md

Blueprint does not define the assembly format here. All AGENTS.md generation is delegated to the "Procedure: Assemble AGENTS.md" section of `.agents/SKILL-implementation.md` (owned by init). Follow that procedure verbatim whenever AGENTS.md must be written.

No shims are prepended here — shims are for model-specific files (CLAUDE.md, copilot-instructions.md). The blueprint skill only touches `AGENTS.md`, not model-specific files.

---

## Scope Boundaries — What Blueprint Never Does

- Never modifies `.agents/global_core.md` (universal contract — change deliberately and separately)
- Never modifies `.agents/shims/` (model-specific overrides — out of scope)
- Never reads secret files (see Hard Exclusions above)
- Never runs `git commit`, `git push`, or deploy commands
- Never moves an intent to `done/` without explicit user confirmation
- Never creates intents in `in-flight/` or `done/` directly — open first, user moves
