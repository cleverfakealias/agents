# GitHub Copilot — Anti-Patterns

GitHub publishes an **explicit "don't" list** for `copilot-instructions.md` ([response customization docs](https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/prompting/response-customization)). The first six below are theirs verbatim.

## The official "don't" list

1. **No references to external resources.** "Conform to the styleguide in `my-org/other-repo`" — Copilot won't fetch it.
2. **No persona / tone directives.** "Answer like a friendly colleague, informal language" — ignored.
3. **No response-length caps.** "Under 1000 characters, words ≤12 chars" — ignored.
4. **No format mandates.** "Always respond as a bulleted list" — ignored.
5. **No task-specific instructions.** Repo-wide file is for general guidance only; task rules belong in **prompt files**.
6. **No large code dumps, secrets, or non-actionable content.**

## Don't put in `copilot-instructions.md`

- **Language defaults.** Copilot knows TS/Py/Rust/Go. State *deltas* from defaults.
- **File-by-file architecture.** Rots the moment you refactor. Use README + AGENTS.md.
- **Sprint/team status.** Frequently-changing info — Copilot can't help with stale context.
- **Hortatory rules.** "Write clean code", "be thorough" — measurable behavior change: zero.

## `.instructions.md` anti-patterns

- **Missing `applyTo`** — file becomes opt-in only; nobody knows to invoke it. Either add `applyTo` or move the content to `copilot-instructions.md`.
- **Overlapping globs producing duplicate rules** — Copilot dedupes by file path, not by rule content. Two files with the same rule waste the budget.
- **`applyTo: '**/*'`** — that's just the global file. Move rules there.
- **Hundreds of lines per file** — pick one concern per file. `typescript.instructions.md` shouldn't also cover testing.

## `.prompt.md` anti-patterns

- **Stale variables.** `${input:name}` that isn't referenced in the body. Dead UI in the parameter form.
- **`agent: agent` but tools left blank.** Forces a default tool set you didn't pick. Always declare `tools:` explicitly.
- **Putting house rules in a prompt.** Prompts are templates, not rule definitions. Rules belong in `.instructions.md` or the global file.

## Custom agents (`.agent.md`) anti-patterns

- **One agent per task.** Five agents for "review-ts", "review-py", "review-rust" — combine into one with a model that handles all three. The agent list bloats fast.
- **Locked-in `model:` with no fallback** — when the model is deprecated, the agent breaks. Use a `model:` array.
- **Agents that duplicate prompts.** Use an agent when you want a persistent persona; use a prompt when you want a one-shot template. Don't model both as agents.

## MCP anti-patterns (`.vscode/mcp.json`)

- **`mcpServers` instead of `servers`** — wrong key, server silently absent.
- **`sandboxEnabled: false` by default** — stdio sandbox is the safety floor for untrusted servers. Turn it back on.
- **Secrets directly in `env`** — committed → leaked. Use `inputs` for prompted strings, or `${input:...}`.

## Cloud coding agent anti-patterns

- **Job name not `copilot-setup-steps`** — the workflow runs but Copilot doesn't see it.
- **Using `if:` / `needs:` / `env:` at job level** — not honored. Move into `steps:`.
- **>59 minute timeout** — capped silently at 59.
- **Secrets in regular Actions secrets** — coding agent reads the **Agents** environment, not the default one.

## Sources

- [Response customization (the official "don't" list)](https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/prompting/response-customization)
- [Best practices for coding agent](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks)
- [Coding agent environment](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)
