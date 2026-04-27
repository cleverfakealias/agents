---
name: init-ai-folder
description: "Set up AGENTS.md, scaffold .ai/ AI-agent standards, initialize agent rules for a repo, or generate llms.txt. Triggers: 'set up agent rules', 'scaffold .ai/', 'create AGENTS.md', 'initialize llms.txt', 'add agent standards to this repo'. Two paths: auto-explore the codebase or answer guided questions."
---

# Initialize .ai/ Folder — Interactive Setup

Scaffold the `.ai/` agent-standards directory and generate a customized `project_context.md` + `AGENTS.md`. Two paths: auto-explore your codebase or answer guided questions.

> **BEFORE EXECUTING:** Read `ai/SKILL-implementation.md` (sibling file) for the full step-by-step logic — config-file detection order, AskUserQuestion payloads, template-substitution rules, error handling, and assembly steps. The summary on this page is for orientation; the implementation doc is the contract.

---

## How to Use

### Standalone (New Repo)
```bash
# In the target repo root:
# 1. Manually copy this .ai/ folder into your repo
# 2. Open any file and read this SKILL.md
# 3. Run the skill → choose auto-explore or manual
# 4. The skill generates project_context.md and AGENTS.md
```

### From Source
If you maintain a central `.ai/` template, instruct users to:
```bash
cp -r /path/to/template/.ai /path/to/target/.ai
```
Then invoke this skill from the target repo.

---

## Path 1: Auto-Explore

Claude reads your codebase and auto-detects:
- **Language & runtime** from `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, etc.
- **Framework & key deps** from config and lockfiles
- **Commands** (`dev`, `build`, `test`, `deploy`) from scripts
- **Project structure** by scanning `src/`, `lib/`, `app/`, etc.
- **Boundaries** (generated dirs, lockfiles, config)

You confirm detected values, then provide only:
- Project **name**
- Project **purpose** (1 sentence)
- **Owner** (team or person)

### What Gets Generated
```
ai/
├── global_core.md              ← (unchanged — universal rules)
├── project_context.md          ← (GENERATED: filled with detected + provided values)
├── project_context.template.md ← (unchanged — template the skill fills in)
├── llms-template.txt           ← (unchanged — template for llms.txt)
├── README.md                   ← (unchanged)
├── SKILL.md                    ← (this file)
├── SKILL-implementation.md     ← (unchanged — execution contract)
└── shims/
    ├── claude.md               ← (unchanged)
    ├── openai.md               ← (unchanged)
    ├── gemini.md               ← (unchanged)
    ├── copilot.md              ← (unchanged)
    ├── cursor.md               ← (unchanged)
    └── windsurf.md             ← (unchanged)

AGENTS.md                       ← (GENERATED: global_core + project_context)
llms.txt                        ← (GENERATED: machine-readable index)
```

---

## Path 2: Manual Questions

Answer a few guided prompts; Claude generates everything. Sequence:

1. **Project name** — What's this called? (e.g., "zennlogic.com", "payment-api")
2. **Purpose** — One sentence: what does it do? (e.g., "Personal portfolio and AI-powered site built on Astro 6 + Cloudflare Workers")
3. **Owner** — Team or person? (e.g., "Zenn", "Platform Team")
4. **Project type** — Choose from: Node/TypeScript, Python, Rust, Go, Ruby, PHP, Java, Astro, Next.js, FastAPI, Django, Flask, Spring, Other
5. **Stack details** — Versions, key deps, runtime. (e.g., "React 19, Vite 5, Node 20 LTS")
6. **Custom code rules** — Any project-specific overrides to `global_core.md`? (e.g., "Use `@/` import aliases, never relative `../../`")
   - Optional — skip if you follow global defaults.
7. **Anything else?** — Final open-ended field. Add testing setup, git workflow, secrets policy, or anything specific to your project.

### What Gets Generated
Same as auto-explore (see above).

---

## After Generation

### Outputs

Always generated:
- **`ai/project_context.md`** — Your project specifics. Assembled into every prompt.
- **`llms.txt`** (repo root) — Machine-readable index per [llmstxt.org](https://llmstxt.org).
- **`AGENTS.md`** (repo root) — `global_core.md` + `project_context.md`. Read by Claude Code, Copilot, Cursor, Windsurf, Gemini CLI, etc.

Optional (only if requested — Cursor and Windsurf already read `AGENTS.md`):
- **`CLAUDE.md`** — Claude-specific overrides. Takes precedence over `AGENTS.md` in Claude products.
- **`.github/copilot-instructions.md`** — GitHub Copilot reads this in VS Code.
- **`.cursor/rules/agents.mdc`** — Generate only if you use Cursor's scoped-rules system.
- **`.windsurfrules`** + **`global_rules.md`** — Generate only if you use Windsurf's Cascade rule files.

### Dot Prefix & Git
Files created as `ai/` (no dot) for Obsidian compatibility. When pushing to GitHub:
```bash
# Rename to standard .ai/ (dots are hidden in Obsidian but standard in git)
git mv ai/ .ai/
git commit -m "Rename ai/ to .ai/ for GitHub standards"
```

Or keep `ai/` in your repo and document in `.gitignore` if you prefer.

### Next Steps
1. **Commit `AGENTS.md`** — It's the contract; humans read it too.
2. **Optional: Pin as submodule** — If you maintain a central standards repo:
   ```bash
   git submodule add https://github.com/<org>/ai-standards .ai
   ```
3. **Optional: Add CI regeneration** — Create `.github/workflows/sync-agents.yml` to regenerate `AGENTS.md` on push (if you edit `.ai/` files).

---

## Implementation

Detection logic, AskUserQuestion payloads, template-substitution rules, error handling, hard rules, and troubleshooting all live in **[`SKILL-implementation.md`](SKILL-implementation.md)** — read it before executing the skill. This page stays orientation-only on purpose; one source of truth per concern.
