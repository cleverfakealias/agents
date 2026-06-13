# Other providers — pointers and gotchas (June 2026)

The scaffold is Claude Code–native, but `scaffold/AGENTS.md` is the cross-tool
contract: it's read natively by nearly every other agent. This file is the short
list of what each tool needs and what bites people. Verify against the linked
docs before relying on details — this surface changes monthly.

## AGENTS.md (the standard)

Stewarded by the Agentic AI Foundation under the Linux Foundation; spec at
[agents.md](https://agents.md). Plain Markdown, no required fields,
nearest-file-wins in monorepos. Read natively by Codex, Cursor, Copilot,
VS Code, Devin, Zed, Jules, Warp, and most others.

- **Claude Code does NOT read it natively** — hence the `@AGENTS.md` import in
  `scaffold/CLAUDE.md`.
- **Gemini CLI does NOT read it by default** — needs opt-in config (below).
- "Supports AGENTS.md" varies: nested-file handling, layering, and caps differ
  per tool. Don't assume uniform behavior.

## Cursor

- Reads `AGENTS.md` natively, including nested ones (nearest wins). Rules live
  in `.cursor/rules/*.mdc`; root `.cursorrules` is legacy — migrate off it.
- A plain `.md` dropped into `.cursor/rules/` is silently ignored (needs `.mdc`
  frontmatter). Put plain markdown guidance in AGENTS.md instead.
- Since 2.4, Cursor has Agent Skills (`SKILL.md`), hooks (`beforeSubmitPrompt`,
  `PreToolUse`, `PostToolUse`, `stop`) and **Claude Code hook compatibility in
  its CLI** — this scaffold's hooks may work there; test before trusting.
- Docs: [cursor.com/docs/rules](https://cursor.com/docs/rules)

## GitHub Copilot

- Three layers: `.github/copilot-instructions.md` (repo-wide, all surfaces),
  `.github/instructions/*.instructions.md` (path-scoped via `applyTo:` glob),
  and `AGENTS.md` (nearest-wins).
- In VS Code, AGENTS.md files **outside the workspace root are off by default**.
- JetBrains/Xcode/Eclipse Copilot read only `.github/copilot-instructions.md`.
- Coding-agent environment setup: `.github/workflows/copilot-setup-steps.yml`.
- Docs: [Repository custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)

## OpenAI Codex

- Most elaborate AGENTS.md handling: global (`~/.codex/AGENTS.md`) → root →
  nested, concatenated root-first. **Silent 32 KiB combined cap**
  (`project_doc_max_bytes`) — oversized trees lose tail content with no warning.
- An `AGENTS.override.md` anywhere up the tree silently replaces its sibling —
  a classic "why is it ignoring my instructions" bug.
- Has skills (`~/.codex/skills/<name>/SKILL.md`, name+description frontmatter),
  hooks, and subagents. Skill matching is description-driven; vague
  descriptions never fire.
- Docs: [developers.openai.com/codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md)

## Gemini CLI

- Default context file is `GEMINI.md`. To use AGENTS.md, set
  `{"context": {"fileName": ["AGENTS.md", "GEMINI.md"]}}` in
  `.gemini/settings.json` — note the setting **replaces** the default, so keep
  `"GEMINI.md"` in the array.
- Custom commands are TOML under `.gemini/commands/`; extensions bundle MCP
  servers, commands, hooks, and skills.
- `/memory show` displays the exact concatenated context — use it to verify
  what actually loaded.
- Docs: [geminicli.com/docs](https://geminicli.com/docs/)

## Devin Desktop (formerly Windsurf)

- Windsurf became Devin Desktop in June 2026 (Cognition); the bundled agent is
  Devin Local, Cascade is being phased out.
- Reads AGENTS.md; `.windsurfrules` is legacy — don't create it for new
  projects. Three generations of ignore files coexist (`.devinignore`,
  `.windsurfignore`, `.codeiumignore`).
- Docs links in this ecosystem rot fast; start from the
  [changelog](https://windsurf.com/changelog).
