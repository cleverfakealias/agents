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
    └── scaffold-context/
        ├── SKILL.md            ← skill: scaffold + audit nested AGENTS.md
        └── SKILL-implementation.md
```

---

## Quick Start

**Fastest way to set up a new repo with these standards:**

1. Copy this `.agents/` folder into your target repo:
   ```bash
   cp -r .agents/ /path/to/your-repo/.agents
   ```
2. Read `.agents/SKILL.md` in a Claude session
3. Choose: **auto-explore** (Claude reads your codebase) or **manual questions** (you answer 7 prompts)
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

**Q: I invoked the skill but it's asking me project type when I expected auto-explore.**
A: Auto-explore only works if it finds config fi