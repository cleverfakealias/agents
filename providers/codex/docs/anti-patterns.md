# OpenAI Codex — Anti-Patterns

## AGENTS.md anti-patterns

- **Aspirational/vague rules.** "Be careful", "write clean code", "follow best practices". Ignored, every time.
- **Human-style documentation.** Architecture essays, history, change logs. Belongs in README.md, not AGENTS.md.
- **Day-one kitchen sink.** Dumping every conceivable rule before observing what Codex actually gets wrong. Start minimal; add a rule only after you've seen the mistake twice.
- **Monolithic files >150 lines.** Codex retrieval degrades. Split into nested `<subdir>/AGENTS.override.md` or reference skill files.
- **Contradictory priorities.** "Be thorough but fast" — pick one. Codex resolves contradictions arbitrarily.
- **Secrets, tokens, real-looking placeholders.** Use literal `EXAMPLE_API_KEY`; never `sk-...`.

## `config.toml` anti-patterns

- **Secrets in committed `.codex/config.toml`.** Use env var names only (`env = { GITHUB_TOKEN_ENV = "GITHUB_TOKEN" }`). The token itself stays in your shell/secret manager.
- **`sandbox_mode = "danger-full-access"` as the default.** That's the YOLO profile, opt-in only. Default project config should be `workspace-write` + `on-request`.
- **Pinning a model that's about to be deprecated.** Pin model families (`gpt-5.5`), not snapshot dates.
- **Profile that mixes destructive sandbox + `approval_policy = "never"` on a laptop host.** That's the YOLO footgun — use only inside a container or VM.

## Sandbox anti-patterns

- **`--dangerously-bypass-approvals-and-sandbox` on your host.** Cattle, not pets — only inside ephemeral containers.
- **Running Codex in Docker without `openai/codex-universal`.** Other images lack the kernel caps; only `danger-full-access` works reliably. The universal image mirrors cloud Codex so behavior matches.

## Skills anti-patterns

- **Custom prompts (`~/.codex/prompts/`) for repo-shareable workflows.** Deprecated. They live only in user scope and never sync. Use Skills.
- **Skill body >500 lines.** Codex starts truncating. Move detail to bundled `references/` files; keep the body terse.
- **Skill `description` that's vague.** "PR review skill" won't trigger; "Use when the user asks to review a PR or before merging" will.
- **`disable-model-invocation: true` on everything.** Defeats auto-discovery. Set it only for skills that should be `/`-invoked exclusively.

## MCP anti-patterns

- **Looking for `mcp.json`.** Codex uses `[mcp_servers.<name>]` tables in `config.toml`. There's no separate file.
- **Missing `startup_timeout_sec`.** Servers that hang freeze the agent. Set explicitly.
- **`required = true` on a server that's often offline.** Codex refuses to start. Use `required = false` for optional integrations.

## Cloud Codex anti-patterns

- **Putting secrets in env vars instead of secrets.** Secrets are wiped before the agent runs; env vars persist. If the agent needs the secret at runtime, materialize it into image/state during setup (export to a file, bake into the snapshot).
- **Heavy install in the agent phase.** Network is disabled by default during agent runtime. Pre-install during setup.
- **Setup script that depends on the task branch.** Setup runs against the default branch before the agent checks out the task branch. Branch-specific setup belongs in the maintenance script.

## Output style anti-patterns

- **Asking Codex to explain everything.** It already over-explains. Tell it `Output: diff only` or `Output: changes + 1-line rationale per file`.
- **Letting Codex refactor opportunistically.** Drive-by changes are its default mode. The single-line "Modify only files required by the task. No drive-by cleanup." rule kills it.

## Sources

- [AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
- [Best practices](https://developers.openai.com/codex/learn/best-practices)
- [Custom prompts (deprecated)](https://developers.openai.com/codex/custom-prompts)
- [Cloud environments](https://developers.openai.com/codex/cloud/environments)
- [Sandboxing](https://developers.openai.com/codex/concepts/sandboxing)
