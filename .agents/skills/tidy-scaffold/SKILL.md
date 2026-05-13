---
name: tidy-scaffold
description: "Remove unused .agents/ scaffolding leftovers — consumed templates, shims for tools you don't use, opted-out layer folders, blank placeholders. Triggers: 'clean up .agents/', 'remove unused scaffolding', 'tidy agent files', 'prune shims', 'delete unused agent templates', 'cleanup scaffold leftovers', 'which .agents/ files can I delete'."
---

# tidy-scaffold — Remove Unused .agents/ Scaffolding

After `init-agents-folder`, `scaffold-context`, and `blueprint` have run, the `.agents/` folder accumulates artifacts that may no longer be needed: templates whose generated counterpart exists, shims for tools the team doesn't use, opted-out layer folders, and blank placeholder files. This skill identifies and removes them.

> **BEFORE EXECUTING:** Read [`SKILL-implementation.md`](SKILL-implementation.md) (sibling file) for the full step-by-step logic — detection rules per category, AskUserQuestion payloads, hard exclusions, sweep eligibility, and error handling. This page is orientation only; the implementation doc is the contract.

---

## When to Use

| Situation | Mode |
|---|---|
| You want to know what's removable but not delete anything | **Scan** |
| You want to walk each candidate and confirm individually | **Interactive** |
| You want unambiguously-safe leftovers gone in one pass | **Sweep** |
| You just consolidated stacks and dropped a tool (e.g. no more Cursor) | **Interactive** or **Sweep** |
| You opted out of architecture or intents layers and want their folders gone | **Sweep** (after confirming opt-out) |

---

## Removal Categories

The skill recognizes five categories. Each has its own detection rule (see implementation doc):

1. **Consumed templates** — `project_context.template.md`, `llms-template.txt`, `nested-agents-md.template.md` once the generated counterpart exists. Removable: safe, you can re-fetch from upstream if needed.
2. **Unused shims** — `.agents/shims/<model>.md` where no corresponding assembled file exists in the repo (no `CLAUDE.md`, no `.github/copilot-instructions.md`, etc.). Requires user confirmation that the tool isn't used.
3. **Opted-out layer folders** — `.agents/architecture/` or `.agents/intents/` if the `llms.txt` pointer line for that layer is still commented out (sentinel = layer never enabled).
4. **Empty layer scaffolds** — `intents/open/` etc. containing only `.gitkeep`; architecture `.mmd` files left unchanged from their templates; nested `AGENTS.md` still containing only template placeholders.
5. **Orphaned skill folders** — `.agents/skills/<name>/` where the user has never invoked it and confirms they won't. Conservative default: keep unless explicitly removed.

---

## Mode 1: Scan

Read-only freshness/usage report. **Never deletes any file.**

- Walks `.agents/` and applies all five detection rules.
- For each candidate, reports the file/folder path, the category, the detection signal, and the risk level (`safe` / `confirm-tool-unused` / `confirm-layer-opted-out`).
- Ends with `AskUserQuestion`: "Re-run in Interactive or Sweep mode for the safe candidates?"

**When to pick it:** You're auditing what's there before any cleanup, or you want a record of what the skill *would* remove.

---

## Mode 2: Interactive

Same detection as Scan, but pauses on each candidate via `AskUserQuestion`.

- Shows a 3-line preview of the file (or directory listing) before asking.
- Options per candidate: `Remove` / `Keep` / `Explain why this exists`.
- "Explain" prints the original purpose of the file (from `.agents/README.md`) so you can decide informed.
- For shim files and orphaned skill folders, requires you to confirm the corresponding tool/skill isn't used before offering removal.
- For layer folders, requires you to confirm the layer was deliberately opted out.
- Caps at **20 candidates per run** — more than that, narrows to the first 20 by category priority and tells you to re-run.

**When to pick it:** First time running cleanup, or after a stack change where you want a deliberate pass.

---

## Mode 3: Sweep

Auto-removes **only unambiguously-safe items**. Everything else gets reported, not deleted.

Auto-removes without per-item confirmation:
- Category 1 (consumed templates) where the generated counterpart exists and was not modified to match the template again.
- Category 4 (empty layer scaffolds) where the file/dir is provably untouched: `.gitkeep`-only directories, `.mmd` files identical to their `.template.mmd` source, nested `AGENTS.md` containing only the unmodified template body.

Requires upfront blanket confirmation (single `AskUserQuestion`) before removing:
- Category 2 (unused shims) — user names which tools they don't use; skill removes shims for those.
- Category 3 (opted-out layer folders) — user confirms architecture and/or intents layers are not in use; skill removes their entire scaffolding folders.

Never auto-removes:
- Category 5 (orphaned skill folders) — always falls through to "report only, prompt to re-run Interactive."
- Anything inside `.git/`, any secret file, any file outside `.agents/`.

**When to pick it:** You know the lay of the land and want speed; you've already done a Scan pass and trust the categorization.

---

## What Gets Created / Updated

### Scan mode
- **Nothing written.** Output only: removal candidates report.

### Interactive and Sweep modes
- Deletes files and (where appropriate) directories under `.agents/` according to confirmed categories.
- Prints a one-line audit entry per deletion to stdout (no separate file written).
- Updates `llms.txt` if it removed a layer folder — comments out the corresponding pointer lines if they were uncommented.

### Never touched by this skill
- `.agents/global_core.md` — universal contract.
- `.agents/project_context.md` — repo specifics.
- `.agents/SKILL.md` and `.agents/SKILL-implementation.md` — init skill files.
- `.agents/README.md` — human documentation.
- Root `AGENTS.md` — assembled contract.
- Root `README.md`, `CHANGELOG.md`, `LICENSE`, or any other root file outside the `llms.txt` rewrite.
- `.git/`, lockfiles, build directories, secret files (see Hard Exclusions in implementation doc).
- Hand-written `AGENTS.md` files (nested), even if listed as candidates — Interactive mode still requires explicit `Remove`.

---

## Self-Management Contract

- **Reads `project_context.md` and `llms.txt` before every run** — uses `do-not-touch` list and layer-pointer status to drive detection.
- **Default mode is Scan** — destructive modes require explicit selection.
- **Always shows a 3-line preview** of any file before deleting in Interactive mode.
- **Always prints a one-line audit log entry** per deletion (Interactive and Sweep modes).
- **Never deletes files outside `.agents/`** — except `llms.txt` updates when removing layer folders, and only the comment status of pointer lines.
- **Never removes a hand-edited file silently** — if a file's mtime is after `verified-at` (in any frontmatter present) or its content differs from the upstream template by more than whitespace, it falls out of Sweep eligibility into Interactive reporting only.
- **Caps at 20 candidates per run** in Interactive mode — narrow scope to a category for the rest.
- **Never reads secret files** — `.env`, `*.pem`, `*.key`, etc. See Hard Exclusions in implementation doc.

---

## Implementation

All execution logic — detection rules per category, exact AskUserQuestion payloads, sweep eligibility, the `llms.txt` pointer update, and error handling — lives in **[`SKILL-implementation.md`](SKILL-implementation.md)**. Read it before executing.
