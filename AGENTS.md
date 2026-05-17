# AGENTS.md — this repo's own contract
<!--
  This is the META-REPO contract — instructions for working on the per-provider scaffolds
  themselves, not for projects that use the scaffolds.

  Substance copies from shared/principles.md. The scaffolds under providers/<name>/scaffold/
  are TEMPLATES, not active code — they aren't run, they're copied into target repos.

  Keep this file tight. Long-form guidance for editing scaffolds lives in each
  providers/<name>/README.md.
-->

## Identity

You're working on `agents/` — a collection of per-provider AI agent scaffolds. Each `providers/<name>/scaffold/` is a hand-tuned template using that provider's native idioms. The canonical rule set lives at [`shared/principles.md`](shared/principles.md).

Ground every claim in evidence — read the provider's actual docs before changing its scaffold. Hallucinated flags / fields are the #1 failure mode here because each provider's surface changes monthly.

## Reasoning

- Before editing a `providers/<name>/scaffold/`, read that provider's [`docs/best-practices.md`](providers/) and verify the change against current upstream docs. Cite the URL in the commit body.
- Before adding a principle to [`shared/principles.md`](shared/principles.md), confirm it applies cross-provider. Provider-specific tactics belong in `providers/<name>/docs/`, not shared.

## Code quality (for the scaffolds)

- Each scaffold file ≤ the provider's recommended cap. Specifically:
  - Claude `CLAUDE.md`: ≤200 lines
  - Copilot `copilot-instructions.md`: ≤150 lines
  - Cursor `.mdc` rules: ≤500 lines each
  - Gemini `GEMINI.md`: split with `@./` imports if >300 lines
  - Codex `AGENTS.md`: ≤150 lines, sections ≤50
  - Windsurf rules: ≤12k chars each; `always_on` content soft-capped ~6k total
- Placeholders use HTML comments: `<!-- placeholder description -->`. Substitution replaces the entire comment.
- No real-looking secret strings in any scaffold example. Use literal `EXAMPLE_API_KEY`, never `sk-...`.

## Edit discipline

- **Scope lock**: change one provider's scaffold per PR, OR change `shared/principles.md` and sweep all six providers in one PR. Don't mix.
- When a provider's official docs change (new field, new event, deprecation), update only that provider's folder.
- When `shared/principles.md` changes, grep all six `providers/<name>/scaffold/` trees for the old wording and update each in its native idiom.
- No cosmetic churn across files you aren't otherwise changing.

## Communication (for PRs / commits)

- PR description answers **why**, with a citation: "Cursor 1.6+ deprecated frontmatter on .cursor/commands/*.md — link: cursor.com/changelog/1-6".
- One logical change per commit.

## Security / Secrets

- This repo holds no secrets and must never. If a `.env` file appears, do not read it.
- Scaffold examples reference env var **names** only.

## Testing

No automated tests. Smoke test changes manually:
1. Copy the affected `providers/<name>/scaffold/.` into a sample repo (one TypeScript, one Python, one greenfield).
2. Run the provider's init mechanism in that provider's tool.
3. Verify outputs: no leftover `<!-- ... -->` placeholders, no broken paths, no commands that don't apply to the detected stack.

## Boundaries — Do Not Touch

Without explicit user instruction:

- `shared/principles.md` — canonical rules; changes propagate to every consuming repo. Discuss before editing.
- `legacy/.agents/` — deprecated scaffold preserved for migration reference. Don't extend or "modernize" it.
- `.git/`.

# Project Context

## Identity

- **Name**: agents
- **Purpose**: A collection of per-provider AI agent scaffolds. Each `providers/<name>/scaffold/` is a hand-tuned, native-idiom template for one tool (Claude Code, GitHub Copilot, Cursor, Gemini CLI, OpenAI Codex, Windsurf).
- **Owner**: Zenn

## Stack

- **Runtime**: n/a (template repo — scaffolds are read by AI agents in target repos, not executed)
- **Framework**: n/a
- **Language**: Markdown (templates) + small fenced bash/JSON/TOML/YAML examples
- **Key deps**: none

## Commands

```bash
# No install/build/test for the template itself.
# Smoke test: copy a scaffold into a sample repo, run its init mechanism, verify outputs.
```

## Project Structure

```
agents/
├── shared/
│   ├── principles.md            # canonical rule set, source of truth
│   └── README.md
├── providers/
│   ├── claude/                  # Claude Code optimized scaffold + docs
│   ├── copilot/                 # GitHub Copilot
│   ├── cursor/                  # Cursor
│   ├── gemini/                  # Gemini CLI
│   ├── codex/                   # OpenAI Codex
│   └── windsurf/                # Windsurf
└── legacy/.agents/              # pre-split multi-provider scaffold (deprecated)
```

## Code Style — Project Overrides

- HTML-comment placeholders (`<!-- ... -->`), not Jinja-style.
- Each provider's scaffold uses **only that provider's native idioms**. No cross-pollination ("Claude-style frontmatter on a Cursor command" → wrong).
- Markdown heading hierarchy is load-bearing for several providers (Gemini, Codex). Never skip levels.

## Git Workflow

- Branches: `feat/<provider>-<scope>`, `fix/<provider>-<scope>`, `docs/<scope>`.
- Commits: imperative present tense. Cite the provider's doc URL when a change reflects upstream news.
- PRs: link to a real failure mode (provider changelog, broken behavior observed) the change prevents.
