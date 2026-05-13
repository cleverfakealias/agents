---
name: scaffold-context
description: "Scaffold nested AGENTS.md files for directories with local invariants, audit context freshness, map per-directory context coverage, update stale agent context. Triggers: 'scaffold nested AGENTS.md', 'generate directory context', 'per-directory context', 'context coverage', 'audit context freshness', 'which AGENTS.md files are stale', 'populate nested agent files', 'context drift'."
---

# scaffold-context — Nested AGENTS.md Scaffolding & Audit

Walk the codebase, score directories for local-invariant density, and write meaningful nested `AGENTS.md` files with purpose / invariants / boundaries / entry points already populated. Three modes: **Auto** (write immediately), **Guided** (review each draft before writing), **Audit** (freshness report, never writes).

> **BEFORE EXECUTING:** Read `.agents/skills/scaffold-context/SKILL-implementation.md` (sibling file) for the full step-by-step logic — scoring rubric, AskUserQuestion payloads, frontmatter stamping, audit freshness rules, and error handling. This page is orientation only; the implementation doc is the contract.

---

## When to Use

| Situation | Mode |
|---|---|
| You want candidate dirs identified and files written in one pass | **Auto** |
| You want to review each draft before it lands on disk | **Guided** |
| You want to know which existing nested AGENTS.md files have drifted | **Audit** |
| You want a map of which dirs have coverage and which don't | **Audit** |
| The init skill scaffolded blank AGENTS.md files; you want them populated | **Auto** or **Guided** |

---

## Mode 1: Auto

Identify candidate directories, synthesize context from their files, and write nested `AGENTS.md` without pausing.

- Walks the repo tree; skips `.git/`, `node_modules/`, lockfiles, and dirs listed in `llms.txt` `do-not-touch`.
- Scores each directory with a polyglot rubric (file count, naming patterns, public surfaces, churn). Patterns cover Node/TS, Java/Kotlin, Go, Rust, .NET, Ruby, Elixir, and Swift conventions (`internal/`, `cmd/`, `controller/`, `repository/`, `src/bin/`, etc.); threshold ≥ 4.
- Detects each directory's index file using a per-language heuristic: `index.ts/js`, `__init__.py`, `mod.rs/lib.rs`, `doc.go`, `package-info.java`, `*.csproj`, `*.gemspec`, `mix.exs`, `Package.swift`, and more. Falls back to `README.md` if none found.
- For >3 candidates: dispatches one Haiku sub-agent per candidate directory in a single parallel batch (up to 12 parallel sub-agents). Each sub-agent reads the directory's README, index file, and largest non-test source file, then drafts the AGENTS.md content. The main agent (Sonnet) collects drafts, stamps frontmatter, and writes files.
- Stamps YAML frontmatter — `verified-against`, `verified-at`, `generated-by: scaffold-context (auto)` — on every file written.
- Caps at **12 candidates per run**; asks you to narrow scope if more qualify.
- Reports: "Wrote N nested AGENTS.md files. Skipped M dirs (below threshold)."

**When to pick it:** You trust the heuristics and want the files populated with no interruptions.

---

## Mode 2: Guided

Same scoring and candidate discovery as Auto, but pauses before writing each file.

- Presents the agent's draft Purpose / invariants / boundaries for each candidate.
- Asks via `AskUserQuestion`: "Write as proposed" / "Let me edit it" / "Skip this directory."
- If you choose "Let me edit it" — asks which sections to revise, accepts free-text, then incorporates your changes before writing.
- Same frontmatter stamping; `generated-by: scaffold-context (guided)`.
- Same 12-candidate cap.

**When to pick it:** You want control over what goes in each file, or the codebase has local conventions the agent can't infer from reading files alone.

---

## Mode 3: Audit

Find every existing nested `AGENTS.md` (everywhere except the repo root), compare freshness against the current commit, and surface drift. **Never writes or modifies any file.**

- Reads YAML frontmatter (`verified-against`, `verified-at`, `generated-by`) from each nested AGENTS.md.
- Compares `verified-against` to `git rev-parse --short HEAD`; counts commits touching each dir since that SHA.
- Classifies each file:
  - **Fresh** — 0 commits since `verified-against`
  - **Lightly drifted** — 1–10 commits
  - **Stale** — >10 commits, or files referenced in the AGENTS.md no longer exist
- Checks for uncovered surface: uses `git log <verified-against>..HEAD -- <file>` to identify load-bearing files (public exports, route handlers, type schemas) that have changed since the stamp but are not mentioned in the AGENTS.md. File mtime is never used — it is unreliable post-clone. If `verified-against` is absent, all load-bearing files in the dir are treated as uncovered.
- Produces a **coverage map** — tree of dirs with AGENTS.md, dirs above threshold without one, and dirs below threshold.
- Ends with `AskUserQuestion`: "Re-run in Auto or Guided mode for the stale dirs?"

**When to pick it:** After a sprint, a refactor, or before a handoff — to know what context has gone stale.

---

## What Gets Created / Updated

### Auto and Guided modes
- `<candidate-dir>/AGENTS.md` — one per confirmed candidate, stamped with YAML frontmatter

### Audit mode
- **Nothing written.** Output only: freshness report + coverage map + proposed next actions.

### Never touched by this skill
- Root `AGENTS.md`
- `.agents/project_context.md`
- `.agents/global_core.md`
- Any file outside a candidate directory's `AGENTS.md`
- Secret files (see Hard Exclusions in implementation doc)

---

## Self-Management Contract

- **Reads `project_context.md` and `llms.txt` before every run** — uses `do-not-touch` list to exclude generated dirs.
- **Stamps every generated file** with `verified-against` (current git SHA), `verified-at` (today), and `generated-by`.
- **Skips dirs that already have AGENTS.md** in Auto/Guided runs — those are handled by Audit mode.
- **Never auto-writes in Audit mode** — output is a report with proposed patches; the user applies them.
- **Caps at 12 candidates per run** — more than that, ask the user to narrow scope to a subtree.
- **Never overwrites a hand-written AGENTS.md** unless the user explicitly confirms ("Let me edit it" in Guided, or intentional re-run on a specific dir).
- **Never reads secret files** — `.env`, `*.pem`, `*.key`, etc. See Hard Exclusions in implementation doc.

---

## Implementation

All execution logic — scoring rubric, exact AskUserQuestion payloads, per-candidate synthesis steps, frontmatter stamping, audit freshness algorithm, coverage map format, and error handling — lives in **[`SKILL-implementation.md`](SKILL-implementation.md)**. Read it before executing.
