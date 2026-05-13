# scaffold-context — SKILL Implementation

**Detailed execution contract. Read this before running the skill.**

---

## Hard Exclusions (apply to every step)

Never read or pass to a subagent: `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`, `~/.aws/credentials`, `~/.config/gcloud/`, `gha-creds-*.json`, `.terraformrc`. If any scan surfaces these, skip silently. Variable **names** may be inferred from non-secret sources (`process.env.X` in code, schema files, `wrangler.toml` `[vars]` keys) — values never.

---

## Sub-Agent Decomposition (Phase 0.5)

Per-candidate-directory synthesis (Phase 2A) is embarrassingly parallel. After candidate scoring and ranking (Phase 1C–1D), the main agent (Sonnet) dispatches one sub-agent per candidate in a single parallel batch.

### Per-directory synthesis sub-agent (Haiku)

**When dispatched:** Auto mode with >3 candidates. In Guided mode, sub-agent dispatch is optional — the main agent may handle synthesis inline since the user reviews each draft anyway.

**Input per sub-agent:**

```json
{
  "dir_path": "<candidate directory path>",
  "hard_exclusions": ["<list from Hard Exclusions above>"],
  "current_sha": "<current-sha from Phase 0B>",
  "scoring_rationale": "<brief: which rubric signals fired for this dir>",
  "index_file_path": "<path to index file if detected, else null>"
}
```

**Sub-agent behavior:**

1. Read `<dir_path>/README.md` (if present).
2. Read the index file at `index_file_path` (if provided), first ~50 lines.
3. Read the largest non-test source file in the directory (one file, by line count).
4. Synthesize a draft `AGENTS.md` for the directory: Purpose, Key invariants, Local boundaries, Entry points, Local conventions (deltas only), Linked context placeholders. Match the nested-AGENTS.md template format exactly.
5. Return the drafted markdown as text only — no file writes.

**Main agent (Sonnet) responsibilities:**

1. Run the scoring rubric (Phase 1C), rank dirs, cap at 12.
2. Dispatch one sub-agent per candidate in a single parallel batch (up to 12 Agent calls in one message).
3. Collect all draft outputs.
4. Add YAML frontmatter (`verified-against`, `verified-at`, `generated-by: scaffold-context (auto)`) to each draft.
5. Write files.
6. In Guided mode: present each draft via `AskUserQuestion` before writing (may use inline synthesis instead of sub-agents).

**Mandatory vs optional:**

- Auto mode, >3 candidates: sub-agent dispatch is **mandatory** (preserves main-agent context window).
- Auto mode, ≤3 candidates: sub-agent dispatch is optional; main agent may synthesize inline.
- Guided mode: sub-agent dispatch is optional; main agent may synthesize inline per-candidate.
- Audit mode: no sub-agents dispatched (Audit never synthesizes new content).

---

## Entry Point

When the skill is invoked, run **Phase 0** immediately. Do not ask for a mode until orientation is complete — the orientation output informs the choice.

---

## Phase 0: Orientation

### 0A. Read Project Context

Read these files in order. Do not skip even if you think you know the contents:

1. `.agents/project_context.md` — stack, structure, boundaries, do-not-touch list
2. `llms.txt` (repo root) — extract the `do-not-touch:` line; these dirs are excluded from all scans

If `.agents/project_context.md` is absent: **stop**. Do not proceed. Tell the user:

```
.agents/project_context.md is missing. scaffold-context needs project context
to ground its candidate scoring.

Run the init skill first (.agents/SKILL.md), then return here.
```

### 0B. Capture Current Commit SHA

Run: `git rev-parse --short HEAD`

Store the result as `<current-sha>`. This value is stamped into every generated file's frontmatter and used as the freshness baseline in Audit mode.

If git history is unavailable (no `.git/`, command fails): note the gap, skip all churn-based scoring signals (+1 for high-churn dirs), and continue. State this limitation in the final report.

### 0C. Mode Selection

Use `AskUserQuestion`:

```
Question: "What would you like to do?"
Header: "scaffold-context — Mode"
Options:
  1. "Auto — score candidates and write files immediately"
     Description: "I'll identify directories that warrant nested AGENTS.md, synthesize context from their files, and write everything in one pass."
  2. "Guided — review each draft before it lands"
     Description: "Same candidate scoring, but I'll show you each draft and ask 'write, edit, or skip' before touching anything."
  3. "Audit — freshness report only, no writes"
     Description: "Find every existing nested AGENTS.md, compare against current git state, and produce a coverage map. Nothing is written."
```

Route to **Phase 1** (Auto/Guided) or **Phase 2C** (Audit).

---

## Phase 1: Candidate Discovery (Auto and Guided)

### 1A. Detect Monorepo Structure

Before scanning: check for `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`, `packages/`, or `apps/` containing multiple sub-projects.

If detected, ask:

```
Question: "This looks like a monorepo. Which part should I scan?"
Header: "Scope"
Options:
  1. "The whole repo — scan all packages"
  2. "A specific package or subdirectory — I'll tell you which"
  3. "Just the repo root tree (skip packages/ and apps/)"
```

Store the scope boundary. All subsequent scanning respects it.

### 1B. Walk the Directory Tree

Scan directories up to depth 4 (configurable — default 4). Exclude immediately:

- `.git/`
- `node_modules/`
- Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`, `go.sum`, `poetry.lock`, `Gemfile.lock`, `composer.lock`)
- All dirs listed in `llms.txt` `do-not-touch:` line
- Build/generated dirs: `dist/`, `build/`, `.next/`, `.astro/`, `.wrangler/`, `target/`, `__pycache__/`, `.venv/`, `venv/`, `coverage/`, `.turbo/`
- Dirs already containing an `AGENTS.md` (they exist — Audit mode handles them)

For each remaining dir, collect:
- File count (source files only — exclude lockfiles, binaries, images)
- Directory name
- Whether it contains a language-appropriate index file (see index-file heuristic below)
- Whether it contains a `README.md`
- Whether it contains an `OWNERS` or `CODEOWNERS` file

**Index-file heuristic (per-language).** Detect the directory's "entry point" or "documented surface" by checking for the first match in priority order:

- JavaScript / TypeScript: `index.ts`, `index.tsx`, `index.js`, `index.mjs`
- Python: `__init__.py`, `__main__.py`
- Rust: `mod.rs`, `lib.rs`, `main.rs`
- Go: `doc.go` if present; otherwise the file matching `<dirname>.go`; otherwise the first non-test `.go` file in the directory
- Java: `package-info.java`; otherwise the first `public class` file matching the directory name
- Kotlin: `<Dirname>.kt` matching the package name
- C# / .NET: any `*.csproj` in the dir (the project file itself acts as the index)
- Ruby: any `*.gemspec` in the dir; otherwise `lib/<dirname>.rb`
- Elixir: any `mix.exs`; otherwise `lib/<dirname>.ex`
- Swift: `Package.swift`; otherwise files in `Sources/<DirName>/`

Priority when multiple candidates match: explicit documentation file (`doc.go`, `package-info.java`) > package-marker file (`*.gemspec`, `*.csproj`, `mod.rs`) > main entrypoint (`main.rs`, `__main__.py`) > best-effort index.

Read the chosen index file's first ~50 lines for the directory description. If no index file is found, fall back to the directory's `README.md`.

### 1C. Score Each Directory

Apply this rubric cumulatively. Higher score = stronger candidate.

| Signal | Points |
|---|---|
| Dir contains ≥ 5 source files | +2 |
| Dir name matches a high-signal pattern (see rubric groups below) | +2 |
| Dir name matches a medium-signal pattern (see rubric groups below) | +1 |
| Dir contains a public re-export surface (any language index file from the heuristic above) | +2 |
| Dir has its own `README.md` | +1 |
| Dir has its own `OWNERS` or `CODEOWNERS` reference | +1 |
| Git churn in last 90 days exceeds repo median for non-leaf dirs (skip signal if git history unavailable) | +1 |
| Dir is purely test-focused: `__tests__/`, `tests/`, `*.test.*`, `*.spec.*` files only | −3 |
| Dir already has an `AGENTS.md` | −5 (effectively excluded) |

**Scoring rubric — pattern groups (award +2 for API/web, domain, persistence, or security; +1 for config or bridges):**

API / web surface (+2):
- Node/TS: `routes/`, `api/`, `pages/api/`, `app/api/`
- Java/Kotlin: `controller/`, `controllers/`, `resource/`, `resources/`, `endpoint/`
- Go: `handler/`, `handlers/`, `api/`, `transport/`
- Rust: any dir under `src/bin/`, `examples/`
- .NET: `Controllers/`, `Endpoints/`
- Ruby: `controllers/`, `app/controllers/`

Domain / business logic (+2):
- Java/Kotlin: `service/`, `services/`, `domain/`, `usecase/`, `usecases/`
- Go: `internal/`, `pkg/`, `domain/`, `service/`
- DDD-flavored (any stack): `adapter/`, `adapters/`, `application/`, `infrastructure/`, `infra/`

Persistence (+2):
- Anywhere: `migrations/`, `models/`, `entities/`, `entity/`, `schema/`, `repository/`, `repositories/`, `dao/`, `dto/`

Security-sensitive (+2):
- Anywhere: `auth/`, `auth*/`, `payments/`, `billing/`, `subscription/`, `credentials/`, `secrets/`, `middleware/`

Configuration / environment (+1):
- Anywhere: `config/`, `configs/`, `environments/`, `env/`

Bridges to external systems (+1):
- Anywhere: `clients/`, `gateways/`, `integrations/`, `connectors/`, `webhooks/`

**Threshold:** Score ≥ 4 → candidate.

**Cap:** If more than 12 directories meet the threshold, take the top 12 by score. Tell the user:

```
Found N directories above threshold (≥ 4). Capping at 12 for this run.
The remaining N-12 can be covered in a follow-up run — consider narrowing
scope to a subtree (e.g. re-run with src/payments/ as root).
```

### 1D. Present Candidate List

Before proceeding to synthesis, show the user the candidate list and scores:

```
Candidates identified (N):

  Score  Directory
  ─────  ─────────────────────────────
    7    src/lib/auth/
    6    src/routes/payments/
    5    src/api/webhooks/
    ...

Proceeding to synthesize context for each. (Guided mode: I'll show you each
draft before writing.)
```

If no directories meet the threshold:

```
No directories scored ≥ 4. The codebase either has few directories above the
density threshold, or most directories are already covered by nested AGENTS.md.

Nothing was written. Consider running Audit mode to check existing coverage.
```

Stop. Do not continue.

---

## Phase 2A: Auto — Per-Candidate Synthesis and Write

For each candidate directory (in descending score order):

### File Reading

Read up to 3 files per directory. Selection order:
1. `README.md` (if present) — always read this first
2. The language-appropriate index file detected by the index-file heuristic (see Phase 1B) — if present
3. The remaining file(s) with the most lines (proxy for "most substance") — read the top 1–2 by line count

Do not read: test fixtures, snapshot files, generated files (`.d.ts`, `.js.map`, `*.generated.*`), or any file on the Hard Exclusions list.

### Synthesis — Populate Template Sections

Using what you read, fill each section:

**Purpose** — One sentence. What this directory exists to do and why it's a distinct unit. Draw from the README intro, the module's public function names, or the import graph implied by `index.*`.

**Key invariants** — Look for:
- Comments containing `INVARIANT`, `CONTRACT`, `IMPORTANT`, `MUST`, `NEVER`
- Type-only re-export patterns (the module exposes types but not implementations)
- Validation boundaries (a function that always validates before returning)
- Domain boundaries (e.g. all JWT operations route through one file)

Write 2–4 invariants as "must" / "never" bullets. If none are evident from reading, write one conservative invariant based on the module's observable shape (e.g. "All public exports must come from `index.ts`.") and note it is inferred.

**Local boundaries — do not touch** — Identify files that are:
- Auto-generated (contain `// DO NOT EDIT`, `// @generated`, or similar)
- Snapshot data (`.snap` files, fixture JSON)
- Schemas that are source-of-truth for other systems

List each with a one-line reason.

**Entry points** — The 1–3 files a new reader should open first. Prefer the public surface file (`index.*`) and the file with the most public function exports.

**Local conventions (deltas only)** — Note anything visible in the files that differs from repo-wide style (e.g. all files use a specific error wrapper, a specific import alias, a naming convention local to this dir). If nothing differs, write "None — follows root AGENTS.md conventions."

**Linked context** — Leave ADRs and intents blank (the user fills these in). Write `— none` as placeholder.

### Frontmatter Stamping

Every generated file gets this YAML frontmatter at the top:

```yaml
---
verified-against: <current-sha from Phase 0B>
verified-at: <today's date as YYYY-MM-DD>
generated-by: scaffold-context (auto)
---
```

### Write

Write to `<candidate-dir>/AGENTS.md`. Confirm each write inline:

```
✓ Wrote src/lib/auth/AGENTS.md
✓ Wrote src/routes/payments/AGENTS.md
...
```

---

## Phase 2B: Guided — Per-Candidate Review Loop

For each candidate directory (in descending score order):

### Synthesize Draft

Follow the same file-reading and synthesis steps as Phase 2A. Do **not** write yet.

### Present Draft and Ask

Use `AskUserQuestion`:

```
Question: "Review draft AGENTS.md for <dir>/"
Header: "Guided — <dir>/"
Description: |
  Purpose: <synthesized one-liner>

  Key invariants:
  - <invariant 1>
  - <invariant 2>

  Local boundaries: <file> — <reason>

  Entry points: <file> — <what it does>

  Local conventions: <delta or "None">
Options:
  1. "Write as proposed"
     Description: "Accept the draft and write <dir>/AGENTS.md now."
  2. "Let me edit it"
     Description: "I'll tell you what to change; you'll revise and show me the updated draft before writing."
  3. "Skip this directory"
     Description: "Don't write an AGENTS.md here — move on to the next candidate."
```

**If "Write as proposed":** Stamp frontmatter with `generated-by: scaffold-context (guided)` and write. Confirm: `✓ Wrote <dir>/AGENTS.md`.

**If "Let me edit it":** Ask:

```
Question: "What should I change in the draft for <dir>/?"
Header: "Edit Draft — <dir>/"
Input: large text
Placeholder: "Purpose should mention it's the payment processing boundary. Add an invariant: 'Never call Stripe API directly outside this module.' Remove the fixtures entry from boundaries."
```

Incorporate the edits, re-present the updated draft inline (not via another AskUserQuestion — just show the revised sections in your response), then ask a simple follow-up:

```
Question: "Write this revised draft for <dir>/?"
Header: "Confirm Write — <dir>/"
Options:
  1. "Yes — write it"
  2. "Edit again"
  3. "Skip"
```

Repeat until the user confirms or skips.

**If "Skip this directory":** Note it as skipped. Move to the next candidate.

---

## Phase 2C: Audit — Freshness Comparison and Coverage Map

### Find Existing Nested AGENTS.md Files

Recursively find all `AGENTS.md` files under the repo root. Exclude:
- The root `AGENTS.md` itself
- Any `AGENTS.md` inside `.agents/` (those are skill/template files)

For each found file: read its YAML frontmatter block (the `---` delimited section at the top of the file).

### Classify Freshness

For each nested AGENTS.md:

1. Extract `verified-against` (a git short SHA) and `generated-by`.
2. If `generated-by` is `hand-written` or frontmatter is absent: mark as **hand-written** — skip freshness comparison, but still check for uncovered surface (see below).
3. If `verified-against` is present: count commits touching the directory since that SHA:
   ```
   git log --oneline <verified-against>..HEAD -- <dir>/
   ```
   - 0 commits → **Fresh**
   - 1–10 commits → **Lightly drifted**
   - >10 commits → **Stale**
4. Also check: do any files named in the AGENTS.md (under Entry points or Local boundaries) still exist? If a named file is gone → **Stale** regardless of commit count.

### Check for Uncovered Surface

For every nested AGENTS.md (including hand-written ones):

Scan the directory for files that look load-bearing but are not mentioned in the AGENTS.md:
- Files matching: `index.*`, `*router.*`, `*handler.*`, `*schema.*`, `*types.*`, `*model.*`, route handler files (Next.js `route.ts`, Express `*.routes.ts`, etc.)

For each such file, determine whether it postdates the stamp using git exclusively:

```
git log <verified-against>..HEAD -- <file>
```

If the log returns commits, the file may have changed since the stamp — flag as potential uncovered surface.
If the log is empty, the file is unchanged since the stamp — skip.
If `verified-against` is absent from frontmatter, treat all load-bearing files as uncovered (do not guess at freshness via mtime or any other heuristic).

The freshness signal is exclusively `git log` since the stamp's SHA. Never use file mtime — mtime is unreliable post-clone.

If any are found and not mentioned → flag as **uncovered surface**.

### Produce Freshness Report

```
Audit Report — <project name> — <today's date>

NESTED AGENTS.md STATUS
───────────────────────────────────────────────────────────────────────
  src/lib/auth/AGENTS.md          Fresh          verified-against: abc1234
  src/routes/payments/AGENTS.md   Lightly drifted  3 commits since def5678
  src/api/webhooks/AGENTS.md      STALE          14 commits since 0ab1234
  src/components/ui/AGENTS.md     Hand-written   (skipping freshness; checking surface)
  src/migrations/AGENTS.md        STALE          src/migrations/0042_add_audit_log.ts not in entry points

UNCOVERED SURFACE
─────────────────
  src/lib/auth/         new file: src/lib/auth/mfa.ts (not mentioned)
  src/components/ui/    new file: src/components/ui/Combobox.tsx (not mentioned)

COVERAGE MAP
────────────
  ✓ src/lib/auth/                (has AGENTS.md — Fresh)
  ✓ src/routes/payments/         (has AGENTS.md — Lightly drifted)
  ✓ src/api/webhooks/            (has AGENTS.md — STALE)
  ✓ src/components/ui/           (has AGENTS.md — hand-written)
  ✓ src/migrations/              (has AGENTS.md — STALE)
  ~ src/lib/email/               (candidate, score 5 — no AGENTS.md)
  ~ src/lib/queue/               (candidate, score 4 — no AGENTS.md)
  · src/utils/                   (below threshold, score 2 — no AGENTS.md)
  · src/hooks/                   (below threshold, score 1 — no AGENTS.md)

Legend: ✓ = has AGENTS.md  ~ = candidate without AGENTS.md  · = below threshold
```

### Audit "What Next" Prompt

After the report, ask:

```
Question: "What would you like to do next?"
Header: "Audit — Next Action"
Options:
  1. "Re-run in Auto mode for the stale directories"
     Description: "I'll re-synthesize and overwrite AGENTS.md for the STALE files."
  2. "Re-run in Guided mode for the stale directories"
     Description: "I'll show you a draft for each stale file before overwriting."
  3. "Run Auto or Guided on the candidate dirs that lack coverage"
     Description: "Generate AGENTS.md for the ~ entries in the coverage map."
  4. "Nothing for now — I'll handle it manually"
     Description: "Exit. The report above is the deliverable."
```

If option 1 or 2: re-run Phase 1 with scope restricted to the stale directories (skip the full candidate-scoring walk — use the stale list directly as "candidates"). Then run Phase 2A or 2B accordingly.

If option 3: run Phase 1 with scope restricted to the `~` entries in the coverage map.

If option 4: exit cleanly.

---

## Phase 3: Final Report

After Auto or Guided mode completes, produce a summary:

```
scaffold-context — Done

Files written (N):
  • src/lib/auth/AGENTS.md
  • src/routes/payments/AGENTS.md
  ...

Skipped (M):
  • src/api/internal/ — user skipped  [Guided only]
  • src/components/forms/ — below threshold (score 2)

verified-against: <current-sha>
verified-at: <today's date>

Next steps:
  • Commit the new AGENTS.md files: git add <paths> && git commit -m "Add nested AGENTS.md context files"
  • Run Audit mode after your next sprint to catch drift
  • For hand-edits: set generated-by: hand-written in the frontmatter so Audit skips freshness comparison
```

---

## Error Handling

### No git history available

Skip the churn signal (+1 for high-churn dirs) and the `verified-against` SHA lookup in Audit. Proceed with remaining signals. Report:

```
Note: git history unavailable. Churn-based scoring signals were skipped.
Audit mode cannot compare freshness without git — reporting file-existence
checks only.
```

### No `.agents/project_context.md`

Stop immediately. Do not scan any directories. Tell the user to run the init skill first. (See Phase 0A.)

### No directories meet the threshold (score ≥ 4)

Report the coverage map showing all dirs with scores, note none exceeded the threshold, suggest Audit mode if nested AGENTS.md files already exist, and exit cleanly. Do not write any files.

### AGENTS.md found without YAML frontmatter

Treat as `generated-by: hand-written`. In Auto/Guided: skip (directory already has an AGENTS.md — Audit handles it). In Audit: include in freshness report with `Hand-written` classification; still perform uncovered-surface check; do not attempt freshness comparison.

### Candidate dir has an existing AGENTS.md (caught late in the walk)

Do not overwrite silently. In Auto mode: skip with a note ("Skipped src/lib/auth/ — already has AGENTS.md; run Audit to check freshness."). In Guided mode: skip silently (the −5 score penalty should have excluded it; if it appeared anyway, skip).

### User aborts mid-Guided session

Write a note for files already confirmed and written. Do not write files for candidates not yet confirmed. Report what was written and what was not. Exit cleanly.

### More than 12 candidates

Cap at 12 by descending score. Tell the user:

```
N directories qualified (score ≥ 4). Processing the top 12 by score.
Re-run scaffold-context on a specific subtree (e.g. src/api/) to cover the rest.
```

---

## Scope Boundaries — What scaffold-context Never Does

- Never modifies root `AGENTS.md` or `.agents/project_context.md` or `.agents/global_core.md`
- Never reads secret files (see Hard Exclusions above)
- Never runs `git commit`, `git push`, or deploy commands
- Never auto-writes in Audit mode — output is a report only
- Never overwrites a hand-written AGENTS.md without explicit user confirmation in Guided mode
- Never touches files outside the `<candidate-dir>/AGENTS.md` path — no source files modified
- Never generates more than 12 nested AGENTS.md per invocation without asking the user to narrow scope
