# tidy-scaffold — SKILL Implementation

**Detailed execution contract. Read this before running the skill.**

---

## Hard Exclusions (apply to every step)

Never read, list, delete, or pass to a subagent: `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`, `~/.aws/credentials`, `~/.config/gcloud/`, `gha-creds-*.json`, `.terraformrc`. If any scan surfaces these, skip silently.

Never delete, never propose to delete, never preview:
- `.git/` and anything inside it
- Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`, `go.sum`, `poetry.lock`, `Gemfile.lock`, `composer.lock`)
- `.agents/global_core.md`
- `.agents/project_context.md`
- `.agents/SKILL.md`
- `.agents/SKILL-implementation.md`
- `.agents/README.md`
- Root `AGENTS.md`
- Root `README.md`, `CHANGELOG.md`, `LICENSE`, `LICENSE.md`
- Any file outside the `.agents/` tree, except for the `llms.txt` rewrite described in Phase 4.

---

## Entry Point

When the skill is invoked, run **Phase 0** immediately. Do not ask for a mode until orientation is complete — orientation determines what categories are even applicable.

---

## Phase 0: Orientation

### 0A. Read Project Context

Read in order. Do not skip:

1. `.agents/project_context.md` — confirms the repo went through init; extracts `Boundaries` for cross-reference.
2. `llms.txt` (repo root) — extracts layer-pointer status (commented vs. uncommented), and `do-not-touch:` line.

If `.agents/project_context.md` is absent: **stop**. Tell the user:

```
.agents/project_context.md is missing. tidy-scaffold operates on a repo that
has been initialized. Run the init skill first (.agents/SKILL.md), then
return here.
```

If `llms.txt` is absent: warn but continue. Layer-pointer detection (category 3) is disabled — fall back to "ask the user" for any architecture/ or intents/ folder found.

### 0B. Inventory `.agents/`

Glob `.agents/**/*`. Build an in-memory inventory:

```
TEMPLATES_PRESENT       = which .template.* files exist
GENERATED_PRESENT       = which generated counterparts exist alongside them
SHIMS_PRESENT           = which .agents/shims/*.md exist
SHIM_OUTPUTS_PRESENT    = which assembled outputs exist (CLAUDE.md, .github/copilot-instructions.md, .cursor/rules/*.mdc, .windsurfrules, global_rules.md)
LAYERS_PRESENT          = which optional-layer folders exist (.agents/architecture/, .agents/intents/)
LAYER_POINTERS          = uncommented-vs-commented status of layer pointers in llms.txt
SKILL_FOLDERS_PRESENT   = which .agents/skills/<name>/ folders exist
NESTED_AGENTS_MD        = list of all AGENTS.md files outside repo root and .agents/
```

Do not read content yet — file existence and llms.txt pointer status only.

### 0C. Mode Selection

Use `AskUserQuestion`:

```
Question: "How aggressive should tidy-scaffold be?"
Header: "tidy-scaffold — Mode"
Options:
  1. "Scan — report candidates only, never delete"
     Description: "Walk .agents/, classify removable items by category, produce a report. Nothing is written or deleted."
  2. "Interactive — walk each candidate, confirm before removing"
     Description: "Same detection as Scan, but pause on each item with Remove / Keep / Explain. Caps at 20 per run."
  3. "Sweep — auto-remove unambiguously-safe items, report the rest"
     Description: "Deletes consumed templates and untouched layer scaffolds without per-item confirmation. Asks one upfront question about unused tools and opted-out layers, then proceeds."
```

Route to:
- **Scan** → Phase 1 then Phase 3A (report only) then offer re-run.
- **Interactive** → Phase 1 then Phase 2 (per-candidate loop) then Phase 4 (llms.txt rewrite if needed) then Phase 3B.
- **Sweep** → Phase 1 then Phase 2S (sweep batch) then Phase 4 then Phase 3C.

---

## Phase 1: Detection

For every category, build the candidate list. A candidate is `{path, category, signal, risk, preview_lines}` where:
- `path` — absolute or repo-relative path
- `category` — one of the five below
- `signal` — the concrete reason it qualifies
- `risk` — one of `safe`, `confirm-tool-unused`, `confirm-layer-opted-out`, `confirm-skill-unused`, `manual-review`
- `preview_lines` — first 3 non-empty lines of the file, or directory contents truncated to 3 lines

### Category 1 — Consumed Templates

Detection: a `.template.*` file exists AND its generated counterpart exists in the same directory (or the expected output path).

| Template path | Counterpart that signals consumption |
|---|---|
| `.agents/project_context.template.md` | `.agents/project_context.md` |
| `.agents/llms-template.txt` | `llms.txt` (repo root) |
| `.agents/nested-agents-md.template.md` | Any nested `AGENTS.md` outside repo root and `.agents/` |
| `.agents/architecture/system.template.mmd` | `.agents/architecture/system.mmd` |
| `.agents/architecture/dataflow.template.mmd` | `.agents/architecture/dataflow.mmd` |
| `.agents/architecture/deployment.template.mmd` | `.agents/architecture/deployment.mmd` |
| `.agents/intents/intent.template.md` | Any `.md` file inside `.agents/intents/open/`, `in-flight/`, `done/`, or `abandoned/` (excluding `.gitkeep`) |

Risk: `safe`.

Sweep eligibility: yes — if the counterpart exists AND the template content matches the upstream template body (no edits). To verify "no edits," compare the template file's content character-for-character against itself as committed at HEAD (`git show HEAD:<path>`). If the working-tree copy differs from HEAD, drop it from sweep and report as `manual-review` (someone edited the template; preserve it).

### Category 2 — Unused Shims

Detection: a shim file `.agents/shims/<model>.md` exists AND no assembled output for that model is present in the repo.

| Shim file | Assembled output (presence = "tool in use") |
|---|---|
| `.agents/shims/claude.md` | `CLAUDE.md` (repo root) |
| `.agents/shims/copilot.md` | `.github/copilot-instructions.md` |
| `.agents/shims/cursor.md` | Any file under `.cursor/rules/` |
| `.agents/shims/windsurf.md` | `.windsurfrules` OR `global_rules.md` |
| `.agents/shims/openai.md` | No standard assembled output — always report as `confirm-tool-unused` |
| `.agents/shims/gemini.md` | No standard assembled output — always report as `confirm-tool-unused` |

Risk: `confirm-tool-unused`. The init skill scaffolds all shims by default; absence of the assembled output is a strong signal but not definitive (the user may have a non-standard integration).

Sweep eligibility: only after the upfront blanket confirmation in Phase 2S asks the user which tools they don't use.

### Category 3 — Opted-Out Layer Folders

Detection: `.agents/architecture/` or `.agents/intents/` folder exists AND the corresponding layer-pointer lines in `llms.txt` are still commented out (the init skill uncomments them when the user opts the layer in).

Layer pointer keys to check in `llms.txt`:
- `architecture-dir:`, `architecture-system:`, `architecture-dataflow:`, `architecture-deployment:`, `adr-dir:`
- `intents-dir:`, `intents-open:`, `intents-in-flight:`, `intents-done:`

A layer is considered **opted-out** if every one of its pointer lines is either absent from `llms.txt` or present as a comment (line starts with `#` after optional whitespace).

A layer is considered **opted-in but unused** if pointers are uncommented but the only files inside the folder are templates and `.gitkeep` — that falls under category 4, not 3.

Risk: `confirm-layer-opted-out`.

Sweep eligibility: only after the upfront blanket confirmation in Phase 2S confirms the layer was deliberately opted out.

### Category 4 — Empty Layer Scaffolds

Applies only when a layer is **opted-in** (pointers uncommented) but appears unused. Detect:

- `.agents/intents/open/`, `in-flight/`, `done/`, `abandoned/` containing only `.gitkeep` → each empty subdir is a candidate for removal (but the parent `.agents/intents/` stays).
- `.agents/architecture/*.mmd` files whose content is byte-identical to the corresponding `.template.mmd` source → the user enabled architecture but never populated the diagrams.
- Nested `AGENTS.md` files (outside repo root and `.agents/`) whose content is byte-identical to `.agents/nested-agents-md.template.md` after `<dir>/` substitution → user opted in to scaffolding but never filled in any section.

Risk: `safe` for `.gitkeep`-only dirs and provably-unmodified template-equivalent files. `manual-review` for anything that's been edited.

Sweep eligibility: yes for `safe` items; no for `manual-review`.

### Category 5 — Orphaned Skill Folders

Detection: `.agents/skills/<name>/` exists. Use a heuristic for orphan likelihood:

- If no file in the repo references `skills/<name>/` or the skill's name in `llms.txt`, `AGENTS.md`, `README.md`, or `project_context.md` → report as `confirm-skill-unused`.
- Otherwise → not a candidate.

Never include these built-in skills as candidates unless explicitly named by the user:
- `.agents/skills/blueprint/`
- `.agents/skills/scaffold-context/`
- `.agents/skills/tidy-scaffold/` (this skill — never self-delete)

Risk: `confirm-skill-unused`.

Sweep eligibility: **never**. Skill folders always fall through to Interactive reporting only — too easy to remove something the user occasionally invokes.

### Cap

If Phase 1 produces more than 20 candidates total: take the first 20 by this priority order (category 1, 4, 2, 3, 5). Tell the user in the report:

```
Found N candidates. Showing the first 20 (priority: consumed templates →
empty scaffolds → unused shims → opted-out layers → orphan skills).
Re-run tidy-scaffold after this pass to surface the remaining N-20.
```

---

## Phase 2: Interactive — Per-Candidate Review Loop

For each candidate in priority order:

### Show Preview

Present the candidate inline:

```
[<category-name>] <path>
Signal: <signal>
Risk: <risk>

Preview:
  <line 1>
  <line 2>
  <line 3>
```

For a directory, "preview" is the directory's immediate children, truncated to 3 lines.

### Ask

Use `AskUserQuestion`:

```
Question: "What should I do with <path>?"
Header: "tidy-scaffold — <category-name>"
Options:
  1. "Remove"
     Description: "Delete this file/folder now. Logged to stdout."
  2. "Keep"
     Description: "Leave it. Don't ask about this path again in this session."
  3. "Explain why this exists"
     Description: "Show the original purpose (from .agents/README.md), then ask again."
```

**If "Remove":** delete the path. Print `✗ Removed <path>  (<category>: <signal>)`. Continue.

**If "Keep":** mark the path as kept. Continue.

**If "Explain":**

Read `.agents/README.md` and extract the section describing this file or category. Show it inline. Then re-present the same three-option `AskUserQuestion` (omitting "Explain" this time):

```
Question: "Now: Remove or Keep <path>?"
Header: "tidy-scaffold — <category-name> (after explanation)"
Options:
  1. "Remove"
  2. "Keep"
```

### Risk-Specific Gating

For `confirm-tool-unused` candidates: before showing the standard Remove/Keep prompt, prepend:

```
This shim is for <model>. I see no <expected-output-file> in the repo, which
usually means the tool isn't in use. Confirm before I offer to remove it.
```

For `confirm-layer-opted-out`: prepend:

```
The <layer> layer pointers in llms.txt are still commented out, which means
the layer was never opted in. The folder appears to be untouched template
scaffolding. Confirm the layer was deliberately opted out.
```

For `confirm-skill-unused`: prepend:

```
This skill folder doesn't appear to be referenced anywhere in the repo
context. Confirm you don't use it before I offer to remove it.
```

If the user does not confirm: mark `Keep` and continue.

### Hand-Edit Detection (within Interactive)

If a file's working-tree content differs from HEAD by more than whitespace (run `git diff --quiet HEAD -- <path>`; non-zero exit = modified), prepend the warning:

```
⚠ This file has been modified since it was last committed. If you removed
it now, the local edits would be lost. Confirm you want to proceed.
```

### Abort Mid-Session

If the user aborts (cancels an AskUserQuestion or sends an interrupt), stop immediately. Report what was already removed. Do not delete the remaining candidates. Phase 4 (llms.txt rewrite) still runs if any layer folder was removed before abort.

---

## Phase 2S: Sweep — Batch Removal

### Upfront Blanket Confirmation

Before any deletion, ask:

```
Question: "Before sweeping, confirm a few things:"
Header: "tidy-scaffold — Sweep Confirmations"
multiSelect: true
Options:
  1. "I don't use Claude Code (no CLAUDE.md needed)"
  2. "I don't use GitHub Copilot (no .github/copilot-instructions.md needed)"
  3. "I don't use Cursor (no .cursor/rules/ needed)"
  4. "I don't use Windsurf (no .windsurfrules / global_rules.md needed)"
  5. "I don't use ChatGPT / OpenAI Codex (no need for the openai shim)"
  6. "I don't use Gemini (no need for the gemini shim)"
  7. "I opted out of the architecture layer (remove .agents/architecture/)"
  8. "I opted out of the intents layer (remove .agents/intents/)"
```

Whichever the user checks, the corresponding category-2 or category-3 candidates become sweep-eligible. Whichever they leave unchecked, the candidates fall through to the Phase 3C report as "not swept — confirm in Interactive mode."

If the user selects **none** of the boxes, sweep is limited to category 1 (consumed templates) and category 4 (empty layer scaffolds with `risk: safe`).

### Sweep Execution

For each sweep-eligible candidate, in priority order (category 1 → 4 → 2 → 3):

1. Re-verify it hasn't been edited locally:
   - Category 1 and 4: run `git diff --quiet HEAD -- <path>`. Non-zero exit (modified) → demote to Phase 3C report as `manual-review`, do not delete.
   - Category 2 and 3: no diff check needed — user explicitly confirmed the tool/layer is unused.
2. Delete the path.
3. Print `✗ Removed <path>  (<category>: <signal>)`.

Sweep never deletes:
- Category 5 (orphan skill folders) — always reported, never auto-removed.
- Any candidate whose `git diff --quiet HEAD --` shows modification (for categories 1 and 4).
- Any path on the Hard Exclusions list (defensive double-check before each `rm`).

---

## Phase 3: Reports

### 3A. Scan Report

```
tidy-scaffold — Scan Report — <today's date>

CONSUMED TEMPLATES (category 1) — safe
──────────────────────────────────────────────────────────────────────────
  .agents/project_context.template.md         (project_context.md exists)
  .agents/llms-template.txt                   (llms.txt exists)

UNUSED SHIMS (category 2) — confirm tool unused
──────────────────────────────────────────────
  .agents/shims/cursor.md                     (no .cursor/rules/ present)
  .agents/shims/windsurf.md                   (no .windsurfrules present)
  .agents/shims/openai.md                     (no standard output to check — verify with user)

OPTED-OUT LAYERS (category 3) — confirm opt-out
───────────────────────────────────────────────
  .agents/intents/                            (intents-dir pointer commented in llms.txt)

EMPTY LAYER SCAFFOLDS (category 4) — safe / manual-review
────────────────────────────────────────────────────────
  .agents/architecture/system.mmd             safe (byte-identical to system.template.mmd)
  src/components/AGENTS.md                    manual-review (modified since template copy)

ORPHAN SKILL FOLDERS (category 5) — confirm skill unused
────────────────────────────────────────────────────────
  .agents/skills/example/                     (no references in repo context)

NEVER TOUCHED BY THIS SKILL
───────────────────────────
  .agents/global_core.md, .agents/project_context.md, .agents/SKILL*.md,
  .agents/README.md, root AGENTS.md, root README/CHANGELOG/LICENSE.

Totals: N candidates across <K> categories.
```

Then offer:

```
Question: "What next?"
Header: "Scan — Next Action"
Options:
  1. "Re-run in Interactive mode"
     Description: "Walk each candidate with Remove / Keep / Explain."
  2. "Re-run in Sweep mode"
     Description: "Auto-remove unambiguously-safe items after one upfront confirmation."
  3. "Nothing for now — I'll handle it manually"
     Description: "Exit. The report above is the deliverable."
```

### 3B. Interactive Report

After the per-candidate loop completes:

```
tidy-scaffold — Interactive Run — <today's date>

Removed (R):
  ✗ <path 1>  (<category>: <signal>)
  ✗ <path 2>  (<category>: <signal>)
  ...

Kept (K):
  · <path 1>  (<reason or "user kept">)
  · <path 2>  ...

llms.txt updated: <yes/no>
  [if yes, list which pointer lines were commented back out]

Next steps:
  • Review changes: git status
  • Commit if satisfied: git add -A && git commit -m "tidy-scaffold: remove unused .agents/ leftovers"
```

### 3C. Sweep Report

```
tidy-scaffold — Sweep Run — <today's date>

Removed automatically (R):
  ✗ <path 1>  (category 1: consumed template — counterpart exists)
  ✗ <path 2>  (category 4: empty layer scaffold — byte-identical to template)
  ...

Demoted to manual review (M):
  ⚠ <path>  (modified locally since HEAD — would have lost edits; left in place)
  ⚠ <path>  (category 5 orphan skill — sweep never auto-removes skill folders)

Not swept — confirm in Interactive mode (N):
  · .agents/shims/cursor.md   (you did not confirm Cursor is unused)
  ...

llms.txt updated: <yes/no>

Next steps:
  • Review changes: git status
  • For the Demoted and Not-swept items, run tidy-scaffold again in Interactive mode.
  • Commit: git add -A && git commit -m "tidy-scaffold (sweep): remove consumed templates and empty scaffolds"
```

---

## Phase 4: llms.txt Pointer Rewrite

If any **layer folder** was removed (category 3) during Phase 2 or 2S, edit `llms.txt`:

For each removed layer, comment out any uncommented pointer lines for that layer. Prepend `# ` to each. Do not delete the lines — keep them commented so a future re-opt-in is a one-line edit.

Layer-to-pointer-keys map:
- Architecture removal → `architecture-dir:`, `architecture-system:`, `architecture-dataflow:`, `architecture-deployment:`, `adr-dir:`
- Intents removal → `intents-dir:`, `intents-open:`, `intents-in-flight:`, `intents-done:`

If no layer was removed, do not touch `llms.txt`.

If `llms.txt` does not exist, do not create it. Note in the report: `llms.txt not present — no pointer rewrite performed.`

---

## Error Handling

### `.agents/project_context.md` missing

Stop immediately. Do not scan. Tell the user to run the init skill first. (See Phase 0A.)

### `llms.txt` missing

Continue with categories 1, 2, 4, 5. Disable category 3 (no way to check pointer status). Phase 4 is a no-op. Report this gap in the final summary.

### No candidates found

```
tidy-scaffold — Nothing to clean

I scanned .agents/ and found no removable candidates:
  • No consumed templates (or none with generated counterparts)
  • No unused shims (all have assembled outputs)
  • No opted-out layers
  • No empty layer scaffolds
  • No orphan skill folders

Your .agents/ folder is already tidy.
```

Exit cleanly.

### Candidate is on the Hard Exclusions list

Should never happen — Phase 1 must filter these out. If it does happen (defensive check before `rm`), skip with a logged warning:

```
⚠ Refusing to delete <path>: matches Hard Exclusions. This is a skill bug —
file an issue.
```

### File deleted between detection and removal

If `rm <path>` fails because the file is already gone (race with the user's editor or another tool): skip with a one-line note `· Already removed: <path>`. Continue.

### Git unavailable

If `git diff --quiet HEAD -- <path>` cannot run (no git, file not tracked):
- For tracked files: assume unmodified (best effort) — log a warning in the final report that local-edit detection was unavailable.
- For untracked files (`.template.*` files often are tracked — but in case of a fork, they may be untracked): treat as `manual-review`, do not sweep.

### User aborts mid-skill

Sweep mode: removals before abort are real; print what was removed. Skip Phase 4 if no layer was removed; run Phase 4 if it was. Exit cleanly.

Interactive mode: same — preserve what was already removed, do not continue the loop, run Phase 4 if applicable.

---

## Scope Boundaries — What tidy-scaffold Never Does

- Never modifies `.agents/global_core.md`, `.agents/project_context.md`, `.agents/SKILL*.md`, `.agents/README.md`, root `AGENTS.md`, root `README.md`, `CHANGELOG.md`, `LICENSE`.
- Never reads secret files (see Hard Exclusions).
- Never runs `git commit`, `git push`, or deploy commands.
- Never auto-deletes in Scan mode (no writes at all).
- Never auto-deletes orphan skill folders (category 5) — always falls through to Interactive.
- Never deletes a path that has uncommitted local edits without an explicit warning + confirmation (Interactive) or by demoting it (Sweep).
- Never touches files outside the `.agents/` tree, except the `llms.txt` pointer rewrite in Phase 4.
- Never self-deletes `.agents/skills/tidy-scaffold/`.
- Never deletes more than 20 candidates per Interactive run without re-prompting the user to narrow scope.
