# Windsurf — Anti-Patterns

## Rule anti-patterns

- **`always_on` on everything.** Each always-on rule pays a per-turn tax. Use `glob` when the rule is language- or area-specific, `model_decision` for specialized domains, `manual` for heavyweight invocations.
- **Soft ceiling: ~6k chars total `always_on`** across all rules + AGENTS.md. Beyond that, retrieval degrades and Cascade starts ignoring rules.
- **`description:` on `always_on` rules.** Only `model_decision` consults the description. Wasted bytes.
- **Missing `description:` on `model_decision` rules.** Cascade has nothing to match against; the rule never fires.
- **Missing `globs:` on `glob` rules.** Rule never injected. Always pair `trigger: glob` with `globs:`.
- **Stale globs.** `src/**/*.ts` that no longer matches your moved code still loads from cache but burns tokens. Grep your rules quarterly.
- **Restating generic best practices.** "Write clean code" / "follow best practices" — Cascade already knows.
- **One big `always_on` rule with everything.** Split by concern. Mis-tagged once = wasted every turn forever.

## Hard limits

| Surface | Cap |
|---|---|
| `global_rules.md` | 6,000 chars |
| Each `.windsurf/rules/*.md` | 12,000 chars |
| Each `.windsurf/workflows/*.md` | 12,000 chars |
| Total MCP tools | 100 |

Hitting any of these → split into multiple files.

## Legacy `.windsurfrules` anti-patterns

- **Keeping it alongside `.windsurf/rules/`.** Two sources of truth, no precedence guarantees. Migrate everything into `.windsurf/rules/` and delete `.windsurfrules`.
- **Adding to `.windsurfrules` in 2026.** Current docs make no mention of it; it's soft-deprecated. New work goes into `.windsurf/rules/` + `AGENTS.md`.

## Workflow anti-patterns

- **Expecting workflows to auto-run.** They're manual only — Cascade won't trigger them from intent. If you want automatic activation, write a rule instead.
- **Workflow steps that aren't atomic.** Each step should be verifiable. "Run tests and deploy and notify Slack" — split into three.
- **Workflow >12k chars.** Cap will silently truncate. Split with workflow-calls-workflow ("Then run `/foo`").

## Memory anti-patterns

- **Storing team conventions as memories.** Memories are machine-local and never sync. Teammates won't get them. Use rules or AGENTS.md.
- **Secrets in memories.** Even fragments. Memories sit in cleartext under `~/.codeium/windsurf/memories/` — never put a secret value in.
- **Stale memories.** They accumulate. Periodically purge from the Memories panel.

## MCP anti-patterns

- **Secrets hardcoded in `mcp_config.json`.** Use `${env:VAR}` interpolation.
- **Forgetting MCP is global.** No project-level config. Adding a server affects all your Windsurf workspaces.
- **>100 tools across all servers.** Cap is enforced. Prune aggressively or use server-specific tool filters.

## Cascade mode anti-patterns

- **Using Code mode for "explain this codebase."** Use Ask — it's read-only and faster.
- **Using Plan mode for trivial edits.** Plans are for non-trivial multi-file work. A two-line config change doesn't need a plan.

## Sources

- [Cascade Memories & Rules](https://docs.windsurf.com/windsurf/cascade/memories)
- [AGENTS.md support](https://docs.windsurf.com/windsurf/cascade/agents-md)
- [Workflows](https://docs.windsurf.com/windsurf/cascade/workflows)
- [MCP Integration](https://docs.windsurf.com/windsurf/cascade/mcp)
