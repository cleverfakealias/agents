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
├── global_core.md         ← (unchanged — universal rules)
├── project_context.md     ← (GENERATED: filled with detected + provided values)
├── README.md              ← (unchanged)
├── SKILL.md               ← (this file)
└── shims/
    ├── claude.md          ← (unchanged)
    ├── openai.md          ← (unchanged)
    ├── gemini.md          ← (unchanged)
    └── copilot.md         ← (unchanged)

AGENTS.md                   ← (GENERATED: global_core + project_context)
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
- **`ai/project_context.md`** — Your project specifics. Assembled into every prompt.
- **`AGENTS.md`** (repo root) — `global_core.md` + `project_context.md`. Read by Claude Code, Copilot, Cursor, Gemini CLI, etc.
- **`CLAUDE.md`** (optional) — Claude-specific overrides. Takes precedence over `AGENTS.md` in Claude products.
- **`.github/copilot-instructions.md`** (optional) — GitHub Copilot reads this in VS Code.

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

## Implementation Notes

### Auto-Explore Detection Order
Checks in this order (first match wins for primary language):

| Signal | Inferred |
|---|---|
| `package.json` + `tsconfig.json` | Node.js + TypeScript |
| `package.json` | Node.js + JavaScript |
| `pyproject.toml` | Python |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `Gemfile` | Ruby |
| `composer.json` | PHP |
| `pom.xml` / `build.gradle` | Java / Kotlin |

Then reads for:
- Framework hints: `astro.config.*`, `next.config.*`, `vite.config.*`, `wrangler.toml`
- Key deps: top 3–5 by relevance (test runner, ORM, validator)
- Scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `deploy`
- Structure: scans for `src/`, `lib/`, `app/`, `components/`, `utils/`, etc.

### Manual Questions Implementation
Uses `AskUserQuestion` tool with:
- Single-select for type (Node, Python, etc.)
- Text input for name, purpose, owner, stack, custom rules, catch-all
- Clear labels and descriptions for each

### File Generation
- Reads `project_context.template.md` from `ai/` folder
- Replaces HTML comment placeholders with detected/provided values
- Writes to `ai/project_context.md`
- Concatenates `ai/global_core.md` + `ai/project_context.md` → `AGENTS.md` (repo root)
- Optional: generates `CLAUDE.md` and `.github/copilot-instructions.md`

---

## Hard Rules

- Never overwrite `ai/project_context.md` without confirmation if one already exists.
- Never read secret files during scan or generation: `.env*`, `.dev.vars*`, `.envrc`, `secrets.*`, `*.pem`, `*.key`, `.npmrc`, `.pypirc`. If one is encountered, skip it silently and note the variable name only if visible from another source (e.g. `process.env.X` in code).
- Never write secret **values** into `project_context.md` or `llms.txt` — variable **names** only. Defer value-handling to the user.
- Never modify files outside `ai/`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` without explicit user instruction.
- After generation, surface any `<!-- TODO -->` markers left in `project_context.md` — these are deliberate placeholders for the user.

---

## Troubleshooting

**"Can't find package.json / pyproject.toml"**
→ Auto-explore works best in repo roots. If you're in a subdirectory, manually specify the project type.

**"Detected wrong framework"**
→ Use manual mode to override, or confirm the detection and edit `project_context.md` afterward.

**"What if I have multiple packages / monorepo?"**
→ Use manual mode and describe your structure in the "Stack details" and "Project Structure" sections.

**"Dot prefix isn't working in Obsidian"**
→ Keeping `ai/` is fine. GitHub convention is `.ai/` — document both in `README.md` and rename before pushing if you want standards compliance.
