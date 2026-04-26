# SKILL Implementation — Interactive .ai/ Setup

**This document describes the detailed logic Claude executes when the SKILL.md is invoked.**

---

## Entry Point

When user invokes this skill, start with:

> You are setting up an interactive `.ai/` agent-standards folder for this project. You'll help the user either auto-explore their codebase or answer guided questions. At the end, you'll generate `project_context.md` and assemble `AGENTS.md`.
>
> **First: Determine the user's preferred path.**

### Hard exclusions (apply to every step below)

Never read or pass to a subagent: `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`, `~/.aws/credentials`, `~/.config/gcloud/`, `gha-creds-*.json`, `.terraformrc`. If `find` / `ls` surfaces any, skip silently. Variable **names** may be inferred from non-secret sources (`process.env.X` in code, schema files, `wrangler.toml` `[vars]` keys) — values never.

---

## Step 1: Ask Path Choice

Use `AskUserQuestion` to present two options:

```
Question: "How would you like to set up your project context?"
Header: "Setup Method"
Options:
  1. "Auto-explore my codebase" 
     Description: "I'll read your config files, detect stack, and infer structure. You confirm and provide name/purpose/owner."
  2. "Answer guided questions"
     Description: "I'll ask you about your project type, stack, and details. You fill in as much or as little as you want."
```

**Store their choice and route to Path A or Path B below.**

---

## Path A: Auto-Explore

### A1. Scan for Config Files

Check for existence (don't read yet):
- `package.json` (Node)
- `pyproject.toml` (Python)
- `Cargo.toml` (Rust)
- `go.mod` (Go)
- `Gemfile` (Ruby)
- `composer.json` (PHP)
- `pom.xml` / `build.gradle` (Java)

Also check for:
- `astro.config.mjs`, `astro.config.ts` (Astro)
- `next.config.js`, `next.config.mjs` (Next.js)
- `vite.config.ts`, `vite.config.js` (Vite)
- `wrangler.toml` (Cloudflare Workers)
- `tsconfig.json` (TypeScript config)

**Logic:** If multiple found, prioritize by this order:
1. **Node.js + TypeScript**: `package.json` + `tsconfig.json`
2. **Node.js + JavaScript**: `package.json` alone
3. **Python**: `pyproject.toml` or `setup.py`
4. **Rust**: `Cargo.toml`
5. **Go**: `go.mod`
6. **Ruby/PHP/Java**: (as above)

### A2. Read & Parse Primary Config

Based on what was found, read the relevant file(s):

#### If Node.js (`package.json`):
- Extract `name`, `description`, `version`
- Extract `engines.node` for Node version
- Look for `scripts.dev`, `scripts.build`, `scripts.test`, `scripts.typecheck`, `scripts.lint`, `scripts.deploy`
- Extract top 3-5 dependencies by category:
  - **Framework**: React, Vue, Svelte, Solid, etc.
  - **Build tool**: Vite, Webpack, esbuild, Astro, Next.js, etc.
  - **Test runner**: Vitest, Jest, Mocha, etc.
  - **Linter**: ESLint, Prettier (note: formatters are dev-only, less critical)
  - **Other**: ORM, validator, server framework, etc.
- If `typescript` is a dep, note it as TypeScript
- If `astro` is a dep, framework is Astro
- If `next` is a dep, framework is Next.js
- Capture versions: "React 18", "Vite 5", "Node 20 LTS"

#### If Python (`pyproject.toml` or `setup.py`):
- Extract project name, description
- Extract `python` version requirement
- Identify framework: FastAPI, Django, Flask, Pydantic, etc.
- Extract top 3-5 key deps
- Look for `[tool.pytest.ini_options]` or test config

#### If Rust (`Cargo.toml`):
- Extract package name, description
- Note any web frameworks (Actix, Tokio, Rocket, etc.)
- Extract key dependencies
- Infer CLI tool, library, or service

#### (Similar for Go, Ruby, PHP, Java — extract comparable sections)

### A3. Detect Project Structure

Scan the codebase for directories:

```bash
# Look for these patterns
find . -maxdepth 2 -type d \( -name "src" -o -name "app" -o -name "lib" -o -name "components" -o -name "utils" -o -name "services" -o -name "routes" -o -name "pages" -o -name "tests" -o -name "test" -o -name "__tests__" \) | head -20
```

Extract:
- Primary source directory: `src/`, `app/`, `lib/`, etc.
- Subdirectories within (if Node): `components/`, `pages/`, `utils/`, `services/`, `api/`, `hooks/`, etc.
- Test location: `tests/`, `test/`, `__tests__/`, `src/__tests__/`, etc.

### A4. Detect Boundaries (Do Not Touch)

Infer "do not modify" files/dirs:
- **Lockfiles**: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`, `go.sum`, `Gemfile.lock`, `composer.lock`, `poetry.lock`
- **Generated/build dirs**: `dist/`, `build/`, `.next/`, `.astro/`, `.wrangler/`, `target/`, `__pycache__/`, `venv/`, `.venv/`, `node_modules/`
- **Config files to preserve**: `tsconfig.json`, `package.json`, `Cargo.toml`, `pyproject.toml`, `.gitignore`, etc.

### A5. Summarize Detection & Ask for Confirmation

Present to user (in readable format):

```
📍 Stack Detected:
  • Language: TypeScript
  • Runtime: Node.js 20
  • Framework: Astro 6 + React 19
  • Key deps: Vite, TailwindCSS, TypeScript
  • Commands: npm run dev, npm run build, etc.
  
📁 Structure:
  • Source: src/
  • Entry: src/pages/
  • Components: src/components/
  • Utils: src/lib/
  • Tests: tests/

🚫 Boundaries detected:
  • pnpm-lock.yaml, dist/, .astro/, node_modules/

Is this correct? Any adjustments?
```

If user says "yes", proceed to A6. If "no", ask them to clarify.

### A6. Ask for Required User Input

Use `AskUserQuestion` to gather:

```
Question 1: "Project name"
Input: text field
Example: "zennlogic.com" or "payment-api"

Question 2: "Project purpose (1 sentence)"
Input: text field
Example: "Personal portfolio and AI-powered site built on Astro 6 + Cloudflare Workers"

Question 3: "Owner (team or person)"
Input: text field
Example: "Zenn" or "Platform Team"
```

**Store responses.**

### A7. Ask for Optional Additions

```
Question: "Anything else you want to include in project_context.md?"
Input: large text field
Examples: Custom code rules, testing setup, git workflow, env variables, secrets policy, etc.
```

**Store the response (it goes into project_context as additional content).**

### A8. Generate `project_context.md` (Path A)

Read the template: `ai/project_context.template.md`

Replace placeholders:
- `<!-- repo name -->` → detected project name + user input
- `<!-- one sentence -->` → purpose from user input
- `<!-- team / person -->` → owner from user input
- `<!-- Runtime, Framework, Language, Key deps sections -->` → fill from detection
- `<!-- Commands section -->` → fill from detected scripts
- `<!-- Project Structure -->` → fill from detected dirs (3-6 lines)
- `<!-- Testing section -->` → fill with detected test setup (if found)
- `<!-- Boundaries section -->` → fill with detected lockfiles + build dirs
- **Append any "anything else" content at the end** (or in appropriate sections)

Write to: `ai/project_context.md`

### A9. Generate `llms.txt` (Path A)

Read the template: `ai/llms-template.txt`

Replace placeholders with detected values:
- `<!-- project name -->` → detected project name
- `<!-- project purpose/description -->` → purpose from user input
- `<!-- language -->` → detected language (TypeScript, Python, Rust, etc.)
- `<!-- framework -->` → detected framework (React, Astro, FastAPI, etc.)
- `<!-- runtime -->` → detected runtime (Node.js 20, Python 3.11, Cloudflare Workers, etc.)
- `<!-- directory for main routes/pages -->` → e.g., `src/pages/` (detected)
- `<!-- directory for UI components -->` → e.g., `src/components/` (detected)
- `<!-- directory for utilities -->` → e.g., `src/lib/` (detected)
- `<!-- stylesheet location -->` → e.g., `src/styles/global.css` (detected)
- `<!-- API route directory -->` → e.g., `src/pages/api/` (if applicable, detected)
- `<!-- comma-separated config files -->` → e.g., `tsconfig.json, package.json, vite.config.ts` (detected)
- `<!-- data directory -->` → e.g., `src/data/` (detected, if exists)
- `<!-- dev command -->` → from detected scripts (e.g., `npm run dev`)
- `<!-- build command -->` → from detected scripts (e.g., `npm run build`)
- `<!-- test command -->` → from detected scripts (e.g., `npm run test`)
- `<!-- typecheck command -->` → from detected scripts (e.g., `npm run typecheck`)
- `<!-- lint command -->` → from detected scripts (e.g., `npm run lint`)
- `<!-- deploy command -->` → from detected scripts or leave blank (e.g., `npm run deploy`)
- `<!-- lockfiles and generated dirs -->` → e.g., `pnpm-lock.yaml, dist/, .astro/, node_modules/` (detected)

Write to: `llms.txt` (repo root)

Proceed to **Step 2: Assembly** below.

---

## Path B: Manual Questions

### B1. Ask Project Basics

Use `AskUserQuestion` (single multi-question):

```
Question 1: "Project name"
Header: "Identity"
Input: text
Placeholder: "zennlogic.com"

Question 2: "Project purpose (1 sentence)"
Header: "Identity"
Input: text
Placeholder: "Personal portfolio and AI-powered site"

Question 3: "Owner (team or person)"
Header: "Identity"
Input: text
Placeholder: "Zenn" or "Platform Team"
```

**Store responses.**

### B2. Ask Project Type

Use `AskUserQuestion` (single select):

```
Question: "What type of project is this?"
Header: "Stack"
Options:
  1. Node.js + TypeScript
  2. Node.js + JavaScript
  3. Python (FastAPI, Django, Flask)
  4. Rust
  5. Go
  6. Ruby
  7. PHP
  8. Java / Kotlin
  9. Astro (Node)
  10. Next.js (Node)
 11. Other / Mixed
```

**Store selection.**

### B3. Ask Stack Details

```
Question: "Describe your tech stack (versions, key dependencies, runtime)"
Header: "Stack"
Input: text
Placeholder: "React 19, Vite 5, Node 20 LTS, TypeScript 5.3, Vitest, ESLint"
```

**Store response.**

### B4. Ask for Custom Rules (Optional)

```
Question: "Any project-specific code style rules or overrides? (optional)"
Header: "Code Style"
Input: text
Placeholder: "Use @/ import aliases, never relative ../../. Prefer async/await over .then()"
```

**Store response (may be empty).**

### B5. Ask Project Structure (Optional)

```
Question: "Describe your project structure briefly (optional)"
Header: "Structure"
Input: text
Placeholder: "src/pages/ for routes, src/components/ for React components, src/lib/ for utilities"
```

**Store response (may be empty).**

### B6. Ask Testing Setup (Optional)

```
Question: "Testing setup details (optional)"
Header: "Testing"
Input: text
Placeholder: "Vitest for unit tests, runs with npm run test, test files in src/__tests__/"
```

**Store response (may be empty).**

### B7. Final Catch-All

```
Question: "Anything else you want to include in project_context.md?"
Header: "Additional"
Input: large text area
Placeholder: "Git workflow, secrets policy, env variables, deployment platform, etc."
```

**Store response (may be empty).**

### B8. Generate `project_context.md` (Path B)

Read the template: `ai/project_context.template.md`

Replace placeholders with user input:
- `<!-- repo name -->` → from B1 Q1
- `<!-- one sentence -->` → from B1 Q2
- `<!-- team / person -->` → from B1 Q3
- `<!-- Runtime, Framework, Language, Key deps -->` → synthesize from B2 (type) and B3 (details)
- `<!-- Commands -->` → ask if needed, or leave as template with common ones
- `<!-- Project Structure -->` → from B5 (if provided)
- `<!-- Code Style — Project Overrides -->` → from B4 (if provided)
- `<!-- Testing -->` → from B6 (if provided)
- `<!-- Boundaries -->` → add standard lockfiles/build dirs for detected type
- **Append any "anything else" content at the end** (from B7)

Write to: `ai/project_context.md`

### B9. Generate `llms.txt` (Path B)

Read the template: `ai/llms-template.txt`

Replace placeholders with user input:
- `<!-- project name -->` → from B1 Q1
- `<!-- project purpose/description -->` → from B1 Q2
- `<!-- language -->` → inferred from B2 (type selection)
- `<!-- framework -->` → inferred from B2 (type selection) and B3 (details)
- `<!-- runtime -->` → inferred from B2 (type selection)
- `<!-- directory for main routes/pages -->` → from B5 (user structure description) or leave blank
- `<!-- directory for UI components -->` → from B5 or infer common pattern
- `<!-- directory for utilities -->` → from B5 or infer common pattern
- `<!-- stylesheet location -->` → from B5 or leave blank
- `<!-- API route directory -->` → from B5 or leave blank (if applicable)
- `<!-- comma-separated config files -->` → infer from B2 (e.g., `tsconfig.json, package.json` for Node, `pyproject.toml, setup.py` for Python)
- `<!-- data directory -->` → from B5 or leave blank
- `<!-- dev command -->` → infer from B2 (e.g., `npm run dev` for Node, `python -m uvicorn main:app` for FastAPI) or leave blank
- `<!-- build command -->` → infer from B2 (e.g., `npm run build` for Node)
- `<!-- test command -->` → from B6 (user testing description) or infer (e.g., `npm run test`)
- `<!-- typecheck command -->` → infer from B2 if TypeScript-based
- `<!-- lint command -->` → infer from B2 or leave blank
- `<!-- deploy command -->` → from B7 (anything else) or leave blank
- `<!-- lockfiles and generated dirs -->` → infer from B2 type (e.g., `pnpm-lock.yaml, package-lock.json, dist/, node_modules/` for Node)

Write to: `llms.txt` (repo root)

Proceed to **Step 2: Assembly** below.

---

## Step 2: Assembly

### 2A. Generate `AGENTS.md` (Always)

Read:
- `ai/global_core.md`
- `ai/project_context.md` (just generated)

Concatenate with a separator:

```
[contents of global_core.md]

---

[contents of project_context.md]
```

Write to: `AGENTS.md` (repo root)

### 2B. Ask for Optional Outputs

```
Question: "Would you also like me to generate model-specific files?"
Header: "Additional Outputs"
Options:
  1. "CLAUDE.md only" (Claude Code, claude.ai, Anthropic API)
  2. ".github/copilot-instructions.md only" (GitHub Copilot)
  3. "Both"
  4. "Neither (just AGENTS.md)"
```

**Store choice.**

### 2C. Generate CLAUDE.md (if requested)

Read:
- `ai/shims/claude.md`
- `ai/global_core.md`
- `ai/project_context.md`

Concatenate:

```
[contents of claude.md]

---

[contents of global_core.md]

---

[contents of project_context.md]
```

Write to: `CLAUDE.md` (repo root)

### 2D. Generate `.github/copilot-instructions.md` (if requested)

Create `.github/` directory if it doesn't exist.

Read:
- `ai/shims/copilot.md`
- `ai/global_core.md`
- `ai/project_context.md`

Concatenate:

```
[contents of copilot.md]

---

[contents of global_core.md]

---

[contents of project_context.md]
```

Write to: `.github/copilot-instructions.md`

---

## Step 3: Report & Next Steps

After all files are generated, summarize for the user:

```
✅ Setup Complete!

📁 Files created:
  • ai/project_context.md
  • llms.txt
  • AGENTS.md

[if CLAUDE.md was generated]
  • CLAUDE.md

[if copilot-instructions.md was generated]
  • .github/copilot-instructions.md

🔍 Stack detected: [auto-explore only: describe what was found]

📋 Open TODOs in project_context.md:
  [list any unresolved <!-- TODO --> markers, if any]

🚀 Next steps:
  1. Review AGENTS.md (it's the contract for all agents in this repo)
  2. Review llms.txt (machine-readable index for AI agents — https://llmstxt.org)
  3. Commit both files: git add AGENTS.md llms.txt && git commit -m "Add agent standards (AGENTS.md, llms.txt)"
  4. (Optional) Rename ai/ to .ai/ before pushing to GitHub for standards compliance
  5. (Optional) Set up CI to regenerate AGENTS.md and llms.txt on push if you edit .ai/ files
```

---

## Error Handling

### Config File Not Found
If auto-explore finds no recognizable config:
```
No config files detected (package.json, pyproject.toml, Cargo.toml, etc.).
This might be a bare project or unusual structure.

Would you like to:
  1. Specify the project type manually (switch to manual mode)
  2. Provide a path to the config file
  3. Proceed with a generic template
```

### Ambiguous / Multi-Repo Setup
If multiple conflicting configs found:
```
Multiple config files detected (package.json AND pyproject.toml).
This might be a monorepo or a project with mixed stacks.

Which is primary?
  1. Node.js (package.json)
  2. Python (pyproject.toml)
  3. I'll describe my structure manually
```

### Already Has project_context.md
If `ai/project_context.md` already exists:
```
⚠️  ai/project_context.md already exists.

Overwrite, merge, or abort?
  1. Overwrite (replace with new generation)
  2. Merge (append new content to existing)
  3. Abort (keep existing, no changes)
```

---

## Key Implementation Notes

1. **File detection**: Use `bash` with `find` or `ls` to check existence without reading large files.
2. **Parsing**: Read config files with `Read` tool; parse JSON/TOML as needed.
3. **Template substitution**: Read template, replace HTML comment markers, write result.
4. **Concatenation**: Use `Read` to get each section, then `Write` to combine.
5. **Always confirm**: After auto-detection, show user what was found and ask for confirmation.
6. **Handle empty input**: If user leaves a question blank, that's okay — either use a sensible default or omit that section.
7. **Preserve formatting**: When writing files, maintain markdown structure and indentation.

---

## User Experience Goals

- **Quick**: Auto-explore should take <2 min. Manual should take <5 min.
- **Safe**: Never overwrite without asking. Always show what's detected.
- **Helpful**: Provide good examples and placeholders. Explain what each field means.
- **Flexible**: Let users skip optional fields. Offer catch-all "anything else" to capture nuance.
- **Clear**: Report what was generated. Tell them what to do next.
