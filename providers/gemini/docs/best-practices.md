# Gemini CLI — Best Practices (2026)

Distilled from geminicli.com/docs and github.com/google-gemini/gemini-cli.

## Memory / instructions hierarchy

Three tiers, loaded in order, concatenated; deeper scope overrides parent on conflict.

| Tier | Path | Purpose |
|---|---|---|
| **Global** | `~/.gemini/GEMINI.md` | User-wide defaults |
| **Project** | `<repo-root>/GEMINI.md` | Repo contract |
| **JIT** | `<any-subdir>/GEMINI.md` | Loaded when tools touch that dir, up to trusted root |

**Imports:** `@./file.md` (relative), `@../file.md`, `@/abs/path.md`. Depth limit 5. Cycle detection built in. `@` inside fenced code blocks is ignored.

## `AGENTS.md` support — first-class

Set in `.gemini/settings.json`:
```json
{ "context": { "fileName": ["AGENTS.md", "GEMINI.md"] } }
```

Both names participate in the **same three-tier hierarchy**. List `AGENTS.md` first so it wins on conflict at the same scope.

This means one canonical `AGENTS.md` serves Gemini, Claude Code, Cursor, Windsurf, and Codex without duplication.

## Settings — `.gemini/settings.json`

Three locations; deepest wins: system → user → project.

```json
{
  "model": { "name": "gemini-2.5-pro" },
  "theme": "GitHub",
  "context": { "fileName": ["AGENTS.md", "GEMINI.md"] },
  "tools": {
    "sandbox": "docker",
    "excludeTools": ["run_shell_command(rm -rf)"]
  },
  "security": { "toolSandboxing": true },
  "checkpointing": { "enabled": true },
  "fileFiltering": {
    "respectGitIgnore": true,
    "respectGeminiIgnore": true
  },
  "chatCompression": { "contextPercentageThreshold": 0.6 },
  "includeDirectories": ["../shared-lib"],
  "mcpServers": { /* see MCP */ },
  "telemetry": { "enabled": false },
  "usageStatisticsEnabled": false
}
```

**Why these defaults:**
- `tools.sandbox: "docker"` + `security.toolSandboxing: true` — safety floor for autonomous runs.
- `checkpointing.enabled: true` — required for `/restore`.
- `fileFiltering.respectGeminiIgnore: true` — keep JIT context loading clean in monorepos.

## Custom slash commands (TOML)

**Path:** `~/.gemini/commands/` (user) and `<repo>/.gemini/commands/` (project, wins on collision).
**Namespacing:** subfolders become `:` — `commands/git/commit.toml` → `/git:commit`.

```toml
description = "Generate commit message from staged diff."
prompt = """
You are a release engineer. Write a Conventional Commits message.

Standards:
@{docs/commit-standards.md}

Staged diff:
```diff
!{git diff --staged}
```

User context: {{args}}
"""
```

**Substitution order:** `@{path}` → `!{cmd}` → `{{args}}`.

- `{{args}}` — raw user text; auto-escaped inside `!{...}`.
- `!{cmd}` — shell execution; user approval required.
- `@{path}` — file/dir injection. Respects `.gitignore` + `.geminiignore`. Multimodal — PNG/JPEG/PDF/audio/video auto-encoded.

## MCP — `mcpServers`

Lives in either settings file. Transport selected by which field is present:

| Field present | Transport |
|---|---|
| `command` | stdio |
| `url` | SSE |
| `httpUrl` | Streamable HTTP |

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "$GITHUB_TOKEN" },
      "cwd": "./",
      "timeout": 600000,
      "trust": false,
      "includeTools": ["create_pr", "list_issues"]
    },
    "remote-sse": { "url": "https://mcp.example.com/sse" },
    "remote-http": {
      "httpUrl": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer $TOKEN" }
    }
  }
}
```

Env interpolation: `$VAR` / `${VAR}` cross-platform; `%VAR%` Windows-only. **Never set `trust: true`** unless the server is yours.

## Extensions

Manifest: `gemini-extension.json` at extension root. Bundles `commands/`, `hooks/hooks.json`, `skills/`, `agents/`, `policies/`, `themes/`.

```json
{
  "name": "my-ext",
  "version": "1.0.0",
  "description": "...",
  "mcpServers": { },
  "contextFileName": "GEMINI.md",
  "excludeTools": ["run_shell_command"],
  "plan": { "directory": ".gemini/plans" }
}
```

Install: `gemini extensions install <github-url | local-path> [--ref] [--auto-update] [--pre-release]`. Use `${extensionPath}` inside `mcpServers.args` to reference bundled binaries.

## Sandbox & approval

| Flag / Env | Values |
|---|---|
| `--sandbox` / `-s` | enable |
| `GEMINI_SANDBOX` | `true`, `docker`, `podman`, `sandbox-exec`, `runsc`, `lxc` |
| `GEMINI_SANDBOX_IMAGE` | custom image (default `ghcr.io/google/gemini-cli:latest`) |
| `SANDBOX_MOUNTS` | `from:to:opts,...` |
| `--approval-mode` | `default`, `auto_edit`, `yolo` |
| `--yolo` | alias for `--approval-mode=yolo` (auto-enables sandbox) |

**Precedence:** CLI flag > env > settings. Autonomous recipe: `--yolo` + `tools.sandbox: "docker"`.

## Built-in slash commands

`/memory show | refresh | list` · `/mcp list | auth | enable | disable | reload` · `/tools` · `/stats` · `/chat save | list | resume | delete | share` · `/restore` (requires `checkpointing.enabled`) · `/compress` · `/clear` · `/extensions` · `/commands list | reload` · `/theme` · `/auth` · `/editor`.

## Sources

- [geminicli.com/docs/cli/gemini-md](https://geminicli.com/docs/cli/gemini-md/)
- [Configuration reference](https://geminicli.com/docs/reference/configuration/)
- [Custom commands](https://geminicli.com/docs/cli/custom-commands/)
- [MCP servers](https://geminicli.com/docs/tools/mcp-server/)
- [Extension reference](https://geminicli.com/docs/extensions/reference/)
- [Sandboxing](https://geminicli.com/docs/cli/sandbox/)
- [Commands reference](https://geminicli.com/docs/reference/commands/)
- [Memory Import Processor](https://geminicli.com/docs/reference/memport/)
