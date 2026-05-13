# .agents/ — AI Agent Standards

Source of truth for AI agent behavior across this repo. Automatically scaffolds into **AGENTS.md** and **llms.txt** (machine-readable index) read by Claude Code, Copilot, Cursor, Windsurf, Gemini CLI, Devin, OpenAI Codex, and others.

---

## Layout

```
.agents/
├── global_core.md              ← universal rules (loaded into every assembly)
├── project_context.template.md ← template → filled per-repo by the init skill
├── llms-template.txt           ← template → filled per-repo by the init skill
├── SKILL.md                    ← skill: interactive repo setup (init)
├── SKILL-implementation.md     ← detailed implementation logic for the init skill
├── README.md                   ← this file
├── shims/
│   ├── claude.md               ← Claude Code, claude.ai Projects, Anthropic API
│   ├── openai.md               ← ChatGPT, GPT-4.1/5, o3/o4-mini, Codex CLI, Responses API
│   ├── gemini.md               ← Gemini 2.0/2.5 (AI Studio, Vertex AI, Gemini CLI)
│   ├── copilot.md              ← GitHub Copilot (VS Code, CLI, agent mode, Workspace)
│   ├── cursor.md               ← Cursor (Composer, Tab, Chat, Background Agents)
│   └── windsurf.md             ← Windsurf (Cascade agent, Flows, Tab, Chat)
└── skills/
    ├── blueprint/
    │   ├── SKILL.md            ← skill: plan features → decompose into intents
    │   └── SKILL-implementation.md
    ├── scaffold-context/
    │   ├── SKILL.md            ← skill: scaffold + audit nested AGENTS.md
    │   └── SKILL-implementation.md
    ├── tidy-scaffold/
    │   ├── SKILL.md            ← skill: remove unused .agents/ scaffolding leftovers
    │   └── SKILL-implementation.md
    ├── scaffold-architecture/
    │   ├── SKILL.md            ← skill: populate / audit architecture mermaid diagrams
    │   └── SKILL-implementation.md
    └── scaffold-adr/
        ├── SKILL.md            ← skill: create / supersede / audit ADRs
        └── SKILL-implementation.md
```

---

## Quick Start

**Fastest way to set up a new repo with these standards:**

1. Copy this `.agents/` folder into your target repo:
   ```bash
   # Linux / macOS:
   cp -r .agents/ /path/to/your-repo/.agents

   # Windows (PowerShell):
   Copy-Item -Recurse .agents C:\path\to\your-repo\.agents
   ```

2. Read `.agents/SKILL.md` in a Claude session.

3. Choose: **auto-explore** (Claude reads your codebase) or **manual questions** (you answer 7 prompts).

4. Claude generates:
   - `.agents/project_context.md` — your project specifics
   - `llms.txt` — machine-readable index (https://llmstxt.org)
   - `AGENTS.md` — assembled prompt for all agents (global_core + project_context)
   - Optional: `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/agents.mdc`

5. **Commit** — `AGENTS.md` is the human+agent contract. Check it in.

That's it.

---

## What Gets Generated

### AGENTS.md (always)
```
[global_core.md] + [project_context.md]
```
Canonical instruction set. Read by every modern AI agent (Claude, Copilot, Cursor, etc.). Commit this to git — it's a contract between humans and agents.

### llms.txt (always)
Machine-readable index of your repo's structure, commands, and key locations. Spec: https://llmstxt.org. Tells agents where routes, components, tests, config files, and API endpoints are.

### CLAUDE.md (optional)
Claude-specific overrides. Takes precedence over `AGENTS.md` in Claude Code, claude.ai, and Anthropic API.
```
[shims/claude.md] + [global_core.md] + [project_context.md]
```

### .github/copilot-instructions.md (optional)
GitHub Copilot reads this in VS Code and other tools.
```
[shims/copilot.md] + [global_core.md] + [project_context.md]
```

---

## The Skill: Interactive Setup

**`.agents/SKILL.md`** — Invoke this in Claude when setting up a new repo.

### Path 1: Auto-Explore
Claude reads your codebase:
- Detects language, framework, runtime from `package.json`, `pyproject.toml`, `Cargo.toml`, etc.
- Infers project structure (routes, components, tests, utils)
- Identifies lockfiles and build directories
- Asks only for: **project name, purpose, owner, anything else**
- Generates `project_context.md` and `llms.txt` automatically

### Path 2: Manual Questions
Answer 7 guided prompts:
1. Project name
2. Purpose (1 sentence)
3. Owner (team or person)
4. Project type (Node, Python, Rust, Astro, Next.js, etc.)
5. Stack details (versions, key deps)
6. Custom code rules (optional)
7. Anything else (catch-all)

Claude generates both files from your answers.

---

## File Descriptions

### global_core.md
Universal rules applied to every project:
- Code quality standards (types, immutability, pure functions, error handling)
- Edit discipline (scope lock, no cosmetic churn, no pre-emptive abstraction)
- Communication style (direct, no hedging)
- Security (no secrets in code, validate input)
- Testing philosophy (behavior not implementation, critical paths + edge cases)
- Git practices (one logical change per commit, imperative tense, clear PRs)

**Do not modify** unless you need team-wide changes across all repos.

### project_context.template.md
Template to fill in per-repo. Copy to `project_context.md` (the skill does this):
- **Identity**: Name, purpose, owner
- **Stack**: Language, runtime, framework, key deps (versioned)
- **Commands**: dev, build, test, typecheck, lint, deploy
- **Project Structure**: Key directories (src/, components/, etc.)
- **Code Style Overrides**: Project-specific rules (beyond global_core.md)
- **Testing**: Framework, where tests live, naming convention
- **Git Workflow**: Branch names, PR conventions
- **Boundaries**: Files and dirs the agent must never modify
- **Environment Variables**: Names (never values)
- **Secrets Policy**: How to handle local vs. prod secrets

### llms-template.txt
Template for the machine-readable index. Copy to `llms.txt` (the skill does this):
- Project metadata (name, description, language, framework, runtime)
- Pointer to `.agents/` folder (for AGENTS.md, llms.txt itself)
- Directory mappings (routes, components, utils, styles, API, etc.)
- Commands (how to dev, build, test, deploy)
- Lockfiles and build directories (do not touch)
- Secrets policy

Read more: https://llmstxt.org

### SKILL.md & SKILL-implementation.md (init skill)
- **SKILL.md**: User-facing instructions. What the user sees when they invoke the skill.
- **SKILL-implementation.md**: Detailed step-by-step logic Claude follows (auto-explore detection, template substitution, file generation, error handling).

### skills/ — Additional Skills

Skills that extend the system after init. Each skill follows the same two-file pattern: `SKILL.md` (orientation + frontmatter for discovery) and `SKILL-implementation.md` (execution contract).

#### skills/blueprint/
**Feature planning with intents.** The day-to-day companion to the init skill — you run init once to set up a repo, and blueprint every time you want to build something new.

Two modes:
- **Plan** — guided discovery (what to build, why, constraints) → stack validation → decomposition into PR-sized work units → creates `.agents/intents/open/` files → optionally updates `project_context.md`, `AGENTS.md`, `llms.txt`, and creates ADRs.
- **Sync** — runs after intents ship; moves files between `open/` → `in-flight/` → `done/`, flags stale in-flight work, regenerates `AGENTS.md` if stale.

Invoke it by reading `.agents/skills/blueprint/SKILL.md` in a Claude session, or using the `blueprint` skill name if installed as a Cowork plugin skill.

#### skills/scaffold-context/
**Per-directory context generation and freshness audit.** Solves the gap left by the init skill: it walks the codebase, ranks directories by local-invariant density (file count, naming patterns, public surfaces, churn), reads representative files in each, and writes meaningful nested `AGENTS.md` files — purpose, invariants, boundaries, and entry points already populated.

Three modes:
- **Auto** — score, synthesize, write in one pass. Caps at 12 candidates per run.
- **Guided** — same scoring, but presents each draft via `AskUserQuestion` for confirm / edit / skip.
- **Audit** — read-only freshness report. Compares each nested `AGENTS.md`'s `verified-against` SHA to current `HEAD`, flags stale or uncovered surfaces, and produces a coverage map of dirs with / without context. Never writes.

Every generated file is stamped with YAML frontmatter (`verified-against`, `verified-at`, `generated-by`) — that's the freshness signal Audit mode reads.

Invoke it by reading `.agents/skills/scaffold-context/SKILL.md` in a Claude session.

#### skills/tidy-scaffold/
**Removes unused `.agents/` scaffolding leftovers.** After init, scaffold-context, and blueprint have run, the `.agents/` folder accumulates artifacts that may no longer be needed: templates whose generated counterpart exists, shims for tools the team doesn't use, opted-out layer folders, blank nested `AGENTS.md` placeholders, and orphan skill folders.

Three modes:
- **Scan** — read-only report grouping candidates by category and risk. Never writes or deletes.
- **Interactive** — same detection, but pauses on each candidate with Remove / Keep / Explain. Caps at 20 per run.
- **Sweep** — auto-removes unambiguously-safe items (consumed templates, byte-identical layer scaffolds) after one upfront confirmation about unused tools / opted-out layers; reports the rest.

Five removal categories: consumed templates, unused shims, opted-out layer folders, empty layer scaffolds, orphan skill folders. Built-in safety: never deletes `global_core.md`, `project_context.md`, root `AGENTS.md`, secrets, or anything with uncommitted local edits (without explicit confirmation). Updates `llms.txt` to comment out pointer lines if a layer folder is removed.

Invoke it by reading `.agents/skills/tidy-scaffold/SKILL.md` in a Claude session.

#### skills/scaffold-architecture/
**Populates the architecture Mermaid diagrams from codebase signals or audits them for drift.** Owns `.agents/architecture/{system,dataflow,deployment}.mmd`. Refuses to run if the architecture layer wasn't opted in at init.

Three modes:
- **Auto** — Tier-1 detection from IaC (`terraform/`, `wrangler.toml`, `docker-compose.yml`, Kubernetes manifests), Tier-2 from manifests (`package.json` etc.), Tier-3 from code references (env var names, route handlers). Nodes tagged `(high)` / `(medium)` / `(low)` confidence; low-confidence get `<!-- TODO: confirm -->` markers — the skill never invents components.
- **Guided** — layered interview: system first → confirm → dataflow → confirm → deployment. Each diagram is a refinement of the prior.
- **Audit** — compares existing diagrams to current codebase. Flags uncovered surfaces (new top-level deps without a node, env vars implying missing externals, IaC additions not represented) and classifies each diagram Fresh / Lightly drifted / Stale.

Every generated file is stamped with YAML frontmatter (`verified-against`, `verified-at`, `generated-by`). 30-node cap per diagram (matches the architecture layer's documented invariant).

Invoke it by reading `.agents/skills/scaffold-architecture/SKILL.md` in a Claude session.

#### skills/scaffold-adr/
**Manages Architecture Decision Records: create, supersede, audit.** Owns `.agents/architecture/decisions/`. Refuses to run if the architecture layer wasn't opted in.

Three modes:
- **New** — guided creation walking through Title → Context → Decision → Alternatives → Consequences (positive/negative/follow-up) → Revisit-when. Auto-numbers with `max(NNNN) + 1` (numbers are append-only, never reused). Writes `NNNN-<kebab>.md` with Status `Proposed`.
- **Supersede** — creates a new ADR that replaces an existing accepted one; performs the **only** allowed mutation of a prior ADR: a single-line Status update from `Accepted` to `Superseded by [ADR-NNNN](./...)`. Nothing else about the prior ADR changes.
- **Audit** — read-only report. Flags missing required sections, invalid Status values, duplicate numbers, dangling supersede links, stale Proposed ADRs (>90 days untouched), and old Accepted ADRs (>12 months) without a Revisit-when trigger.

Built-in immutability contract: accepted ADRs are append-only (the only exception is the Supersede mode's Status-line update). Never edits, never deletes, never reuses numbers, never invents content.

Invoke it by reading `.agents/skills/scaffold-adr/SKILL.md` in a Claude session.

### shims/
Model-specific overrides (≤50 lines each). Only include if the tool reads its own file or you need targeted changes. Never duplicate `global_core.md`.
- **claude.md**: Claude Code, claude.ai Projects, Anthropic API — extended thinking guidance, agentic safety hooks, `TodoWrite` usage
- **openai.md**: ChatGPT, GPT-4.1/5, o3/o4-mini, Codex CLI, Responses API — reasoning modes, `--approval-mode` guidance
- **gemini.md**: Gemini 2.0/2.5 (AI Studio, Vertex AI, Gemini CLI) — long-context hygiene, `--sandbox` guidance
- **copilot.md**: GitHub Copilot (VS Code, CLI, agent mode, Copilot Workspace) — MCP tool-use rules
- **cursor.md**: Cursor (Composer, Tab, Chat, Background Agents) — background agent summary contract
- **windsurf.md**: Windsurf (Cascade agent, Flows) — persistent memory rules

---

## Assembly Logic

The skill does this automatically, but here's how it works:

### Manual Assembly (bash)

Sections are joined with a `---` separator so each block stays parseable on its own.

```bash
# AGENTS.md = global_core + project_context
printf '%s\n\n---\n\n%s\n' "$(cat .agents/global_core.md)" "$(cat .agents/project_context.md)" > AGENTS.md

# Claude-specific (optional)
printf '%s\n\n---\n\n%s\n\n---\n\n%s\n' \
  "$(cat .agents/shims/claude.md)" "$(cat .agents/global_core.md)" "$(cat .agents/project_context.md)" \
  > CLAUDE.md

# GitHub Copilot (optional)
mkdir -p .github
printf '%s\n\n---\n\n%s\n\n---\n\n%s\n' \
  "$(cat .agents/shims/copilot.md)" "$(cat .agents/global_core.md)" "$(cat .agents/project_context.md)" \
  > .github/copilot-instructions.md

# Cursor scoped rule (optional — only if you use .cursor/rules/*.mdc)
mkdir -p .cursor/rules
printf '%s\n\n---\n\n%s\n\n---\n\n%s\n' \
  "$(cat .agents/shims/cursor.md)" "$(cat .agents/global_core.md)" "$(cat .agents/project_context.md)" \
  > .cursor/rules/agents.mdc

# Windsurf rules files (optional — only if you use Cascade rule files)
printf '%s\n\n---\n\n%s\n\n---\n\n%s\n' \
  "$(cat .agents/shims/windsurf.md)" "$(cat .agents/global_core.md)" "$(cat .agents/project_context.md)" \
  | tee .windsurfrules > global_rules.md
```

### Programmatic Assembly (TypeScript/JavaScript)
```ts
import core from './.agents/global_core.md?raw';
import shim from './.agents/shims/claude.md?raw';
import ctx  from './.agents/project_context.md?raw';

const systemPrompt = [shim, core, ctx].join('\n\n---\n\n');
```

---

## Deployment

### Pushing to GitHub

Commit `.agents/` as-is. The dotfolder is recognized by all major agent tools.

### Making This Reusable (Org Template)

If you maintain a central `.agents/` template for your organization:

**Option 1: Git Submodule** (recommended — single source of truth)
```bash
git submodule add https://github.com/<org>/ai-standards .agents
git submodule update --remote --merge
```

**Option 2: CI Sync** (lighter weight)
```yaml
- name: Sync AI standards
  run: |
    curl -fsSL https://raw.githubusercontent.com/<org>/ai-standards/main/global_core.md \
         -o .agents/global_core.md
    curl -fsSL https://raw.githubusercontent.com/<org>/ai-standards/main/shims/claude.md \
         -o .agents/shims/claude.md
    # ... repeat for other files
```

---

## Modifying Files

### Updating global_core.md
- Make changes only if your entire org needs them
- Test: have Claude assemble the full prompt and ask it to "clean up the codebase" — it should refuse or ask for scope (validating that edit-discipline rules survived)
- Commit and push to the org repo
- If using submodule: teams run `git submodule update --remote --merge`

### Per-Repo Changes (project_context.md)
Edit freely. This file is repo-specific. Keep it ≤120 lines.

### Adding a Model Shim
1. Create `.agents/shims/<model>.md` (≤50 lines)
2. Only add model-specific overrides — never duplicate `global_core.md`
3. Test the assembly: invoke the skill or manually concatenate and verify agents still follow edit-discipline
4. Commit
5. If needed, regenerate CLAUDE.md, etc.

---

## Standards & References

- **AGENTS.md spec**: The 2026 open standard read by Claude Code, Copilot, Cursor, Devin, and others
- **llms.txt spec**: https://llmstxt.org — Machine-readable index for AI agents
- **Prompt Engineering**: https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview

---

## Troubleshooting

**Q: Auto-explore is asking project type when I expected detection**
A: Auto-explore only works if it finds a recognizable config file (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle`, `build.gradle.kts`, `*.csproj`, `mix.exs`, `deno.json`, `bun.lock`, `Package.swift`). If none are found, it falls back to the 7-question guided path. Either add a manifest file and re-invoke, or stay in guided.

**Q: I'm on Windows and the bash quickstart fails**
A: Use the PowerShell variant shown in the quickstart, or copy `.agents/` manually. The skill itself uses tool-abstracted file ops (Glob/Read/Write) and works on any OS.

**Q: AGENTS.md already exists when I re-run init**
A: The skill detects collisions and presents Merge / Replace / Skip. Merge preserves your edits where it can; Replace overwrites; Skip keeps the existing file and only regenerates llms.txt and shims.

**Q: The five model shims I don't use are still sitting in `.agents/shims/`**
A: Run the `tidy-scaffold` skill (`.agents/skills/tidy-scaffold/SKILL.md`). Its Scan mode lists candidates without writing; Sweep mode removes unambiguously-safe items (consumed templates, unused shims) after one confirmation.

**Q: My non-JS stack got JS-specific rules in AGENTS.md**
A: `global_core.md` ships universal rules plus a JS/TS-conditional block. Init only appends the JS/TS block when it detects a Node/TS stack. If your stack was misdetected, edit `project_context.md`, re-run assembly (see Procedure: Assemble AGENTS.md in `.agents/SKILL-implementation.md`), or delete the JS/TS rule block by hand.

**Q: I want to update project_context.md after init**
A: Edit it freely. Then re-run the skill in "regenerate only" mode (it skips detection and reassembles `AGENTS.md` from the updated `project_context.md`), or run the assembly command from `.agents/README.md` § Assembly Logic.

**Q: Nested AGENTS.md files are out of date**
A: Run `scaffold-context` in Audit mode. It compares each nested file's `verified-against` SHA to HEAD and produces a freshness report without writing.

**Q: The skill keeps asking me about Windsurf when I don't use it**
A: Answer "neither" when prompted. Init only writes `.windsurfrules` / `global_rules.md` for explicitly selected outputs.