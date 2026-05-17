# OpenAI Codex — Best Practices (2026)

Distilled from `developers.openai.com/codex/*` and `github.com/openai/codex`.

## Memory / instructions hierarchy

Codex concatenates `AGENTS.md` files **root → CWD**, joined by blank lines. Closer-to-CWD files win on conflict.

Per directory, Codex checks in order:
1. `AGENTS.override.md` (subdir overrides; rare at root)
2. `AGENTS.md` (canonical)
3. Any name in `project_doc_fallback_filenames` (config-driven)

Then at user-global scope:
- `~/.codex/AGENTS.override.md` → `~/.codex/AGENTS.md` (only the first non-empty file wins at this level; uses `$CODEX_HOME` if set)

**Cap:** `project_doc_max_bytes` (default 32 KiB total). Discovery stops at the cap — sprawling AGENTS.md trees get truncated.

## Format & size discipline

- Plain Markdown, no required frontmatter.
- Headings are load-bearing — Codex parses by `##` sections.
- **Root AGENTS.md cap: 150 lines.** Each section: ≤50 lines.
- Beyond those caps, Codex truncates or starts ignoring rules.

Recommended root sections:
- `## Setup` — install commands
- `## Build / Test / Lint`
- `## Conventions` — house rules
- `## Scope rules` — what NOT to touch
- `## Done criteria` — observable signals
- `## Do NOT touch` — boundaries

## Config — `~/.codex/config.toml` and `.codex/config.toml`

```toml
model = "gpt-5.5"
model_reasoning_effort = "medium"     # minimal | low | medium | high | xhigh
approval_policy = "on-request"        # untrusted | on-request | never
sandbox_mode = "workspace-write"      # read-only | workspace-write | danger-full-access
web_search = "cached"                 # cached | live | disabled
profile = "default"
project_doc_max_bytes = 32000
project_doc_fallback_filenames = ["AGENTS.md"]

[profiles.review]
model = "gpt-5.3-codex"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
approval_policy = "untrusted"

[profiles.yolo]                       # container/VM ONLY
sandbox_mode = "danger-full-access"
approval_policy = "never"
```

Built-in providers: `openai`, `ollama`, `lmstudio`, `amazon-bedrock`.
Activate a profile: `codex --profile review`.
Override one key for a single run: `codex -c sandbox_mode=read-only`.

**Project `.codex/config.toml`** must be "trusted" (the user opts in to the project). Use it to pin model + sandbox + MCP for the whole team.

## Skills (preferred over custom prompts)

`.codex/skills/<name>/SKILL.md`. Same frontmatter as Claude skills — Codex follows the Agent Skills standard.

```yaml
---
name: review-diff
description: Review the current branch diff for correctness, security, scope, and tests. Use when the user asks for a code review or before opening a PR.
argument-hint: ""
allowed-tools: Bash(git diff*), Bash(git log*), Read, Grep
disable-model-invocation: false
model: inherit
---
Body of the skill — markdown instructions and prompts.
```

Codex auto-discovers skills by `description` and can invoke them implicitly. Ship skills in the repo for team consistency; user-global skills live at `~/.codex/skills/`.

## MCP support

MCP servers are declared in `[mcp_servers.NAME]` tables inside `config.toml`. **No separate `mcp.json`** — that's Cursor's convention.

```toml
[mcp_servers.github]              # stdio
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_TOKEN_ENV = "GITHUB_TOKEN" }   # NAME, not value
enabled = true
required = false
startup_timeout_sec = 10
tool_timeout_sec = 60

[mcp_servers.figma]               # streamable HTTP
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_TOKEN"
```

Manage via `codex mcp add|list|login <name>`; inspect with `/mcp` in-session.

## Sandboxing

| Flag | Maps to |
|---|---|
| `--sandbox read-only \| workspace-write \| danger-full-access` | `sandbox_mode` |
| `--ask-for-approval untrusted \| on-request \| never` | `approval_policy` |
| `--full-auto` | shortcut: `workspace-write` + `on-request` |
| `--dangerously-bypass-approvals-and-sandbox` | bypass — **container/VM only** |

**Platforms:**
- macOS: native Seatbelt (`sandbox-exec`).
- Linux: Landlock + seccomp. (Ubuntu 24.04 may need AppArmor; falls back to bubblewrap.)
- Windows: Windows Sandbox in PowerShell, or WSL2 Landlock.
- Docker: only `danger-full-access` works reliably. Pair with `openai/codex-universal` image (mirrors cloud Codex environment).

## Cloud Codex (ChatGPT)

- Reads `AGENTS.md` from the repo (for lint/test commands), repo tree, default branch + task branch.
- **Setup script:** Bash, configured in the ChatGPT Codex environment UI. Runs in a separate session from the agent — export env via `~/.bashrc`. Network enabled during setup, disabled by default during agent phase (configurable).
- Base image: `openai/codex-universal` (Ubuntu 24.04, polyglot toolchain).
- **Secrets vs env:** env vars persist setup + agent. **Secrets are decrypted only during setup and wiped before the agent runs** — bake what you need into image/state during setup.
- Container cache: up to 12 h. Optional maintenance script re-runs on branch change.
- PR flow: Codex clones default branch, checks out task branch, shows diff. User clicks "Open PR" or iterates.

## Taming Codex's biases

Codex tends toward: verbose explanations, "refactor-while-here" drift, prose paragraphs that don't get followed, ambiguous priorities.

Rules that reliably work in AGENTS.md:

- **Lead with commands, not descriptions.** `pnpm test --filter app` beats "run the tests."
- **Explicit Done criteria per section** ("done when: tests pass, lint clean, no new deps").
- **Scope-lock language**: "Modify only files required by the task. No drive-by cleanup." Suppresses refactor drift measurably.
- **Keep each section ≤50 lines, file ≤150 lines.**
- **Use `AGENTS.override.md`** in subdirs for service-specific deltas instead of conditional prose in root.

## Agents SDK / Responses API interplay

If the repo *builds on* the Agents SDK, document patterns in AGENTS.md that Codex respects when writing agent code:

- System prompts live in `src/prompts/*.md` — edit there, never inline.
- Tool schemas: use Zod (TS) / Pydantic (Py); call `zodFunction()` / `pydantic_function_tool()`.
- Structured outputs: `response_format: { type: "json_schema", strict: true }`.
- Handoffs: use `RECOMMENDED_PROMPT_PREFIX` from `agents.extensions.handoff_prompt`.

## Sources

- [AGENTS.md guide (OpenAI)](https://developers.openai.com/codex/guides/agents-md)
- [Config reference](https://developers.openai.com/codex/config-reference)
- [Models](https://developers.openai.com/codex/models)
- [Sandboxing](https://developers.openai.com/codex/concepts/sandboxing)
- [Best practices](https://developers.openai.com/codex/learn/best-practices)
- [Skills](https://developers.openai.com/codex/skills)
- [MCP](https://developers.openai.com/codex/mcp)
- [Cloud environments](https://developers.openai.com/codex/cloud/environments)
- [Agents SDK + Codex](https://developers.openai.com/codex/guides/agents-sdk)
- [openai/codex repo](https://github.com/openai/codex)
- [openai/codex-universal](https://github.com/openai/codex-universal)
